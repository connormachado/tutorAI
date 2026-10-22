"""Pure sympy checks. The only sympy importer (CLAUDE.md). Errors carry codes, never the input."""

import re
from collections import Counter
from dataclasses import dataclass, replace
from fractions import Fraction
from typing import Literal

# sympy ships no type stubs, so its untyped surface stays inside this module. The partially
# typed functions are reached as sympy.<name> so each suppression sits on its call.
import sympy  # pyright: ignore[reportMissingTypeStubs]
from sympy import (  # pyright: ignore[reportMissingTypeStubs]
    Add,
    Eq,
    Expr,
    FiniteSet,
    Float,
    Integer,
    Mul,
    Pow,
    Rational,
    S,
    Symbol,
)
from sympy.parsing.sympy_parser import (  # pyright: ignore[reportMissingTypeStubs]
    implicit_multiplication,
    parse_expr,
    rationalize,
    standard_transformations,
)

# parse_expr calls eval, so only arithmetic reaches it, with no builtins in scope. Variables
# are single letters, so two letters in a row (keywords, method names) are refused, as are
# `**` (a power tower hangs sympy) and any dot that isn't a decimal point (attribute access).
_ALLOWED = re.compile(r"[0-9a-z+\-*/(). ]*")
_FORBIDDEN = re.compile(r"[a-z]{2}|\*\*|(?<!\d)\.|\.(?!\d)")
# Decimals parse as exact rationals, so 2.5 == 5/2 and 0.1 + 0.2 == 0.3.
_TRANSFORMATIONS = (*standard_transformations, rationalize)
_NAMESPACE: dict[str, object] = {
    "__builtins__": {},
    "Symbol": Symbol,
    "Integer": Integer,
    "Rational": Rational,
    "Float": Float,
}
# Child math as written ("3x", "3(x - 4)"), parsed unevaluated; that parse emits Add, Mul and Pow.
_CHILD_TRANSFORMATIONS = (*standard_transformations, implicit_multiplication, rationalize)
_UNEVALUATED_NAMESPACE: dict[str, object] = {**_NAMESPACE, "Add": Add, "Mul": Mul, "Pow": Pow}
# A final answer is short; a longer run of child math never reaches sympy.
_MAX_SPAN = 80


class MathParseError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _parse(text: str, *, as_written: bool = False) -> Expr:
    """With `as_written`, "3x" is 3*x and nothing is evaluated, so "3(x - 4)" stays one term."""
    if not _ALLOWED.fullmatch(text) or _FORBIDDEN.search(text):
        raise MathParseError("disallowed_chars")
    try:
        expr = parse_expr(
            text.strip(),
            local_dict={},
            global_dict=dict(_UNEVALUATED_NAMESPACE if as_written else _NAMESPACE),
            transformations=_CHILD_TRANSFORMATIONS if as_written else _TRANSFORMATIONS,
            evaluate=not as_written,
        )
    except Exception:  # sympy raises SyntaxError, TokenError, NameError, TypeError and more
        raise MathParseError("unparseable") from None
    if not isinstance(expr, Expr):
        raise MathParseError("unparseable")
    return expr


def solution_set_is(equation: str, variable: str, answer: str) -> bool:
    """True when the real solutions of `lhs = rhs` for `variable` are exactly {answer}."""
    sides = equation.split("=")
    if len(sides) != 2:
        raise MathParseError("not_one_equals")
    lhs, rhs = (_parse(side) for side in sides)
    expected = _parse(answer)
    if expected.free_symbols:  # one real solution is a number, not an expression in symbols
        return False
    try:
        solutions = sympy.solveset(Eq(lhs, rhs), Symbol(variable), S.Reals)  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType, reportUnknownVariableType]
        return bool(solutions == FiniteSet(expected))  # pyright: ignore[reportUnknownArgumentType]
    except Exception:  # sympy's error text can quote the expression
        raise MathParseError("sympy_error") from None


def expressions_equal(expression: str, answer: str) -> bool:
    difference = _parse(expression) - _parse(answer)
    try:
        return bool(sympy.simplify(difference) == 0)  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
    except Exception:  # sympy's error text can quote the expression
        raise MathParseError("sympy_error") from None


def states_answer(text: str, answer: str, problem: str) -> bool:
    """True when `text` states `answer`, the canonical answer to `problem` (R-02).

    A number states the answer when it equals it, written as digits, a decimal, a fraction or
    words: 2.5, 5/2 and "two and a half" all count, as does "subtract 9" for -9. If the problem
    itself holds that number, the text may restate or refer to it ("x - 4", "subtracting 4"), but
    not in a reveal phrase ("the answer is 4", "= 4"). An expression answer counts only in its
    final terms, in any order or notation, never as an equivalent unsimplified form such as the
    problem restated.
    """
    expected = _parse(answer)
    normalized = _normalize(text)
    tokens = _tokenize(normalized)
    if expected.free_symbols:
        return _states_expression(normalized, tokens, answer, problem)
    if not isinstance(expected, Rational):
        raise MathParseError("not_rational")
    return _states_number(tokens, Fraction(str(expected)), problem)


# Minus sign, en dash, em dash, times, middle dot, dot operator, divide, right single quote.
_SYMBOLS = str.maketrans(
    {
        "\u2212": "-",
        "\u2013": "-",
        "\u2014": " ",
        "\u00d7": "*",
        "\u00b7": "*",
        "\u22c5": "*",
        "\u00f7": "/",
        "\u2019": "'",
    }
)
_ONES = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
_TEENS = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
]
_UNITS = {word: n for n, word in enumerate(["zero", *_ONES, *_TEENS])}
_TENS = {
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
}
_ORDINALS = {
    "third": 3,
    "fourth": 4,
    "quarter": 4,
    "fifth": 5,
    "sixth": 6,
    "seventh": 7,
    "eighth": 8,
    "ninth": 9,
    "tenth": 10,
    "eleventh": 11,
    "twelfth": 12,
}
_DENOMINATORS = {"half": 2, "halves": 2, **_ORDINALS, **{f"{w}s": d for w, d in _ORDINALS.items()}}
_TENS_RE = re.compile(rf"\b({'|'.join(_TENS)})(?:[- ]({'|'.join(_ONES)}))?\b")
_UNITS_RE = re.compile(rf"\b({'|'.join(_UNITS)})\b")
_AND_A_HALF_RE = re.compile(r"\b(\d+) and a half\b")
_FRACTION_WORDS_RE = re.compile(rf"\b(\d+|a)[ -]({'|'.join(_DENOMINATORS)})\b")
_MIXED_RE = re.compile(r"(?<![\d.])(\d+)(?: and | )(\d+)/(\d+)\b")  # "2 1/2", "2 and 1/2"
_OVER_RE = re.compile(r"\b(\d+) over (\d+)\b")
_WORD_OPERATORS = [
    (re.compile(r"\b(?:is equal to|equals)\b"), "="),
    (re.compile(r"\bplus\b"), "+"),
    (re.compile(r"\b(?:minus|negative)\b"), "-"),
    (re.compile(r"\b(?:times|multiplied by)\b"), "*"),
    (re.compile(r"\bdivided by\b"), "/"),
]
_TOKEN_RE = re.compile(
    r"(?P<num>\d+(?:\.\d+)?|\.\d+)|(?P<word>[a-z]+(?:'[a-z]+)*)|(?P<op>[-+*/=()])|\S"
)
_ARITHMETIC = {"+", "-", "*", "/"}
# A number right after one of these, or right before "is the answer", is stated as the answer.
_REVEAL_BEFORE = {"=", "is", "it's", "that's", "get"}
_REVEAL_AFTER = {("is", "the", "answer"), ("is", "the", "solution")}
_OPERATION_WORDS = {
    **dict.fromkeys(["add", "adding", "added"], "+"),
    **dict.fromkeys(["subtract", "subtracting", "subtracted"], "-"),
}
_OPERATION_BY = {  # "multiply by 5", "dividing by 5"
    **dict.fromkeys(["multiply", "multiplying"], "*"),
    **dict.fromkeys(["divide", "dividing"], "/"),
}

type _Kind = Literal["num", "var", "word", "op", "other"]


@dataclass(frozen=True)
class _Token:
    kind: _Kind
    text: str
    start: int
    end: int
    value: Fraction | None = None
    coefficient: bool = False  # glued to a letter or bracket, as in "5x", so not a number
    parts: tuple[Fraction, ...] = ()  # 24/4 is also 24 and 4; 5/2 is only a fraction

    @property
    def operand(self) -> bool:
        return self.kind in ("num", "var") or self.text == ")"


def _normalize(text: str) -> str:
    """Lowercase, single spaces, one spelling per symbol, number words as numerals, and "plus"
    as "+"."""
    text = " ".join(text.lower().translate(_SYMBOLS).split())
    text = _TENS_RE.sub(lambda m: str(_TENS[m[1]] + (_UNITS[m[2]] if m[2] else 0)), text)
    text = _UNITS_RE.sub(lambda m: str(_UNITS[m[1]]), text)
    text = _AND_A_HALF_RE.sub(lambda m: f"{2 * int(m[1]) + 1}/2", text)
    text = _FRACTION_WORDS_RE.sub(
        lambda m: f"{1 if m[1] == 'a' else m[1]}/{_DENOMINATORS[m[2]]}", text
    )
    text = _MIXED_RE.sub(_mixed, text)
    text = _OVER_RE.sub(r"\1/\2", text)
    for pattern, symbol in _WORD_OPERATORS:
        text = pattern.sub(symbol, text)
    return text


def _mixed(m: re.Match[str]) -> str:
    whole, top, bottom = int(m[1]), int(m[2]), int(m[3])
    return f"{whole * bottom + top}/{bottom}" if 0 < top < bottom else m[0]


def _kind(m: re.Match[str]) -> _Kind:
    if m["num"]:
        return "num"
    if m["word"]:  # one letter is a variable, except the words "a" and "i"
        return "var" if len(m[0]) == 1 and m[0] not in "ai" else "word"
    return "op" if m["op"] else "other"


def _tokenize(text: str) -> list[_Token]:
    tokens: list[_Token] = []
    for m in _TOKEN_RE.finditer(text):
        kind = _kind(m)
        token = _Token(kind, m[0], m.start(), m.end(), Fraction(m[0]) if kind == "num" else None)
        if token.value is not None:
            token = _absorb(tokens, token, token.value)
        elif (
            tokens
            and tokens[-1].value is not None
            and tokens[-1].end == token.start
            and (kind == "var" or token.text == "(")
        ):
            tokens[-1] = replace(tokens[-1], coefficient=True)
        tokens.append(token)
    return tokens


def _absorb(tokens: list[_Token], number: _Token, value: Fraction) -> _Token:
    """Fold a fraction bar or a sign before `number` into it. "5/2" and "-5" are one number each,
    but "x/5" and "24/(2 + 6)" aren't fractions, and the 5 in "x - 5" is 5."""
    top = tokens[-2].value if len(tokens) >= 2 and tokens[-1].text == "/" else None
    if top is not None and value:
        tokens.pop()
        first = tokens.pop()
        quotient = top / value
        parts = () if (quotient.numerator, quotient.denominator) == (top, value) else (top, value)
        text = f"{first.text}/{number.text}"
        return _Token("num", text, first.start, number.end, quotient, parts=parts)
    if tokens and tokens[-1].text in ("-", "+") and (len(tokens) < 2 or not tokens[-2].operand):
        sign = tokens.pop()
        signed = -value if sign.text == "-" else value
        return _Token("num", sign.text + number.text, sign.start, number.end, signed)
    return number


def _is_math(token: _Token) -> bool:
    return token.kind in ("num", "var") or (token.kind == "op" and token.text != "=")


def _math_spans(tokens: list[_Token]) -> list[tuple[int, int]]:
    """Runs of numbers, letters and operators, split at "=", words and punctuation."""
    spans: list[tuple[int, int]] = []
    start = None
    for i, token in enumerate([*tokens, None]):
        if token is not None and _is_math(token):
            start = i if start is None else start
        elif start is not None:
            spans.append((start, i))
            start = None
    return spans


def _reveals(tokens: list[_Token], k: int) -> bool:
    before = [t.text for t in tokens[max(0, k - 2) : k]]
    after = tuple(t.text for t in tokens[k + 1 : k + 4])
    return (
        (bool(before) and before[-1] in _REVEAL_BEFORE)
        or before in (["answer", ":"], ["solution", ":"])
        or after in _REVEAL_AFTER
    )


def _operation(tokens: list[_Token], k: int) -> str | None:
    """What is done with the number at k: "x - 4" and "subtracting 4" both give "-"."""
    before = [t.text for t in tokens[max(0, k - 2) : k]]
    if not before:
        return None
    if tokens[k - 1].kind == "op" and before[-1] in _ARITHMETIC:
        return before[-1]
    if before[-1] in _OPERATION_WORDS:
        return _OPERATION_WORDS[before[-1]]
    if len(before) == 2 and before[1] == "by":
        return _OPERATION_BY.get(before[0])
    return None


def _matches(tokens: list[_Token], k: int, value: Fraction) -> bool:
    """The number at k is `value`, a part of it, or `value` taken away: "subtract 9" adds -9."""
    number = tokens[k].value
    if number is None:
        return False
    taken_away = -number == value and _operation(tokens, k) == "-"
    return number == value or value in tokens[k].parts or taken_away


def _stretches(tokens: list[_Token]) -> set[tuple[str, ...]]:
    texts = [t.text for t in tokens]
    return {tuple(texts[i:j]) for i in range(len(texts)) for j in range(i + 2, len(texts) + 1)}


def _restates(tokens: list[_Token], k: int, copied: set[tuple[str, ...]], longest: int) -> bool:
    """True when the number at k sits in a stretch of math copied from the problem, such as the
    2 in "(4 + 2)". The stretch needs an operator, so a bare number never counts."""
    for i in range(max(0, k - longest + 1), k + 1):
        for j in range(max(k, i + 1), min(len(tokens), i + longest)):
            stretch = tokens[i : j + 1]
            if (
                all(_is_math(t) for t in stretch)
                and any(t.kind == "op" and t.text in _ARITHMETIC for t in stretch)
                and tuple(t.text for t in stretch) in copied
            ):
                return True
    return False


def _states_number(tokens: list[_Token], value: Fraction, problem: str) -> bool:
    written = _tokenize(_normalize(problem))
    # The problem with each coefficient's letter dropped, so "5 - 2" refers to "5x - 2x".
    problem_tokens = [
        t
        for i, t in enumerate(written)
        if not (t.kind == "var" and i and written[i - 1].coefficient)
    ]
    in_problem = [i for i in range(len(problem_tokens)) if _matches(problem_tokens, i, value)]
    operations = {op for i in in_problem if (op := _operation(problem_tokens, i))}
    copied = _stretches(problem_tokens) if in_problem else set[tuple[str, ...]]()
    for k, token in enumerate(tokens):
        if token.coefficient or not _matches(tokens, k, value):
            continue
        if _reveals(tokens, k):
            return True
        if in_problem and (
            _operation(tokens, k) in operations or _restates(tokens, k, copied, len(problem_tokens))
        ):
            continue
        return True
    return False


def _states_expression(text: str, tokens: list[_Token], answer: str, problem: str) -> bool:
    expected = _terms(answer)
    copied = _stretches(_tokenize(_normalize(problem)))
    for span_start, span_end in _math_spans(tokens):
        start, end = _trim_brackets(tokens, span_start, span_end)
        if start == end or tuple(t.text for t in tokens[start:end]) in copied:
            continue  # the problem restated is never its answer
        span = text[tokens[start].start : tokens[end - 1].end]
        if len(span) > _MAX_SPAN:
            continue
        try:
            if _terms(span) == expected:
                return True
        except MathParseError:
            continue
    return False


def _trim_brackets(tokens: list[_Token], start: int, end: int) -> tuple[int, int]:
    """Drop brackets at either end that have no partner inside: "3x - 12)" is 3x - 12."""
    texts = [t.text for t in tokens[start:end]]
    opens, closes = texts.count("("), texts.count(")")
    while start < end and tokens[start].text == "(" and opens > closes:
        start, opens = start + 1, opens - 1
    while start < end and tokens[end - 1].text == ")" and closes > opens:
        end, closes = end - 1, closes - 1
    return start, end


def _terms(text: str) -> Counter[Expr]:
    """The terms as written: "-12 + 3x" has 3x and -12, while "3(x - 4)" is one term."""
    expr = _parse(text, as_written=True)
    try:
        return Counter(sympy.expand(term) for term in Add.make_args(expr))  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
    except Exception:  # sympy's error text can quote the expression
        raise MathParseError("sympy_error") from None
