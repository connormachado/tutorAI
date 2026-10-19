from collections.abc import Callable

import pytest

from platy import mathcheck
from platy.mathcheck import MathParseError, expressions_equal, solution_set_is


@pytest.mark.parametrize(
    ("equation", "variable", "answer", "expected"),
    [
        ("3*x + 4 = 19", "x", "5", True),
        ("3*x + 4 = 19", "x", "6", False),
        ("(2/3)*x = 8", "x", "12", True),
        ("x + 9 + b = x", "b", "-9", True),
        ("2*x = 2*x", "x", "1", False),  # every real solves it, which isn't {1}
        ("2*x = 5", "x", "2.5", True),  # decimals are exact rationals, not floats
        ("0.5*x = 2", "x", "4", True),
        ("y = x", "y", "x", False),  # an answer with a free symbol isn't one real solution
    ],
)
def test_solution_set_is(equation: str, variable: str, answer: str, expected: bool) -> None:
    assert solution_set_is(equation, variable, answer) is expected


@pytest.mark.parametrize(
    ("expression", "answer", "expected"),
    [
        ("3*(x - 4)", "3*x - 12", True),
        ("2/3 + 1/4", "11/12", True),
        ("0.1 + 0.2", "0.3", True),
        ("3*x + 5 - x + 2", "2*x + 6", False),
    ],
)
def test_expressions_equal(expression: str, answer: str, expected: bool) -> None:
    assert expressions_equal(expression, answer) is expected


@pytest.mark.parametrize(
    ("check", "text", "code"),
    [
        (lambda t: expressions_equal(t, "1"), "__import__('os')", "disallowed_chars"),
        (lambda t: expressions_equal(t, "1"), "9**9**9**9", "disallowed_chars"),  # hangs sympy
        (lambda t: expressions_equal(t, "1"), "(2).evalf(3)", "disallowed_chars"),
        (lambda t: expressions_equal(t, "1"), "x if x else 1", "disallowed_chars"),
        (lambda t: expressions_equal(t, "1"), "x.n", "disallowed_chars"),  # attribute access
        (lambda t: expressions_equal(t, "3*x"), "3x", "unparseable"),
        (lambda t: solution_set_is(t, "x", "1"), "x = 1 = 1", "not_one_equals"),
        (lambda t: solution_set_is(t, "x", "5"), "3*x + 4", "not_one_equals"),
    ],
)
def test_rejects_bad_input_with_code_only(
    check: Callable[[str], bool], text: str, code: str
) -> None:
    with pytest.raises(MathParseError) as err:
        check(text)
    assert err.value.code == code
    assert text not in str(err.value)


@pytest.mark.parametrize(
    ("sympy_name", "check"),
    [
        ("solveset", lambda: solution_set_is("x = 1", "x", "1")),
        ("simplify", lambda: expressions_equal("x", "x")),
    ],
)
def test_sympy_failure_becomes_code_only(
    monkeypatch: pytest.MonkeyPatch, sympy_name: str, check: Callable[[], bool]
) -> None:
    def boom(*_args: object, **_kwargs: object) -> None:
        raise ValueError("canary-expression-text")

    monkeypatch.setattr(mathcheck.sympy, sympy_name, boom)
    with pytest.raises(MathParseError) as err:
        check()
    assert err.value.code == "sympy_error"
    assert "canary" not in str(err.value)
