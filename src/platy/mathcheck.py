"""Pure sympy checks. The only sympy importer (CLAUDE.md). Errors carry codes, never the input."""

import re

# sympy ships no type stubs, so its untyped surface stays inside this module. The partially
# typed functions are reached as sympy.<name> so each suppression sits on its call.
import sympy  # pyright: ignore[reportMissingTypeStubs]
from sympy import (  # pyright: ignore[reportMissingTypeStubs]
    Eq,
    Expr,
    FiniteSet,
    Float,
    Integer,
    Rational,
    S,
    Symbol,
)
from sympy.parsing.sympy_parser import (  # pyright: ignore[reportMissingTypeStubs]
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


class MathParseError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _parse(text: str) -> Expr:
    if not _ALLOWED.fullmatch(text) or _FORBIDDEN.search(text):
        raise MathParseError("disallowed_chars")
    try:
        expr = parse_expr(
            text.strip(),
            local_dict={},
            global_dict=dict(_NAMESPACE),
            transformations=_TRANSFORMATIONS,
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
