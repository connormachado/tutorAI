from collections.abc import Callable

import pytest

from platy import mathcheck
from platy.mathcheck import MathParseError, expressions_equal, solution_set_is, states_answer
from platy.skills.skill_map import ProbeProblem, load_skill_map


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
        (
            lambda t: states_answer("5", t, "Solve 3x + 4 = 19."),
            "__import__('os')",
            "disallowed_chars",
        ),
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


SHIPPED = {probe.id: probe for node in load_skill_map().nodes for probe in node.probes}
TWO_STEP = "Solve 3x + 4 = 19."  # answer 5, and no standalone 5 in the problem


@pytest.mark.parametrize(
    ("text", "answer", "problem", "expected"),
    [
        ("The answer is five.", "5", TWO_STEP, True),
        ("So x equals 5.", "5", TWO_STEP, True),
        ("x=5", "5", TWO_STEP, True),
        ("x = 5", "5", TWO_STEP, True),
        ("Is it 5?", "5", TWO_STEP, True),
        ("x = 2.5", "5/2", "Solve 2x = 5.", True),  # exact rationals: 2.5 == 5/2
        ("x = 5/2", "2.5", "Solve 2x = 5.", True),
        ("That's two and a half.", "5/2", "Solve 2x = 5.", True),
        ("Five halves!", "5/2", "Solve 2x = 5.", True),
        ("5 over 2", "5/2", "Solve 2x = 5.", True),
        ("It's negative seven.", "-7", "Solve -5x = 35.", True),
        ("x = minus 7", "-7", "Solve -5x = 35.", True),
        ("x = \u22127", "-7", "Solve -5x = 35.", True),  # Unicode minus sign
        ("x = 7", "-7", "Solve -5x = 35.", False),
        ("twenty-four", "24", "Solve x/4 = 6.", True),
        ("Check: 24/4 = 6.", "24", "Solve x/4 = 6.", True),  # 24/4 isn't a fraction in lowest terms
        ("Is it 2/4?", "1/2", "Solve 2x = 1.", True),
        ("x = .5", "1/2", "Solve 2x = 1.", True),
        ("x = 2 1/2", "5/2", "Solve 2x = 5.", True),
        ("x = 2 and 1/2", "5/2", "Solve 2x = 5.", True),
        ("x = -2 1/3", "-7/3", "Solve 3x = -7.", True),
        ("Try 25.", "5", TWO_STEP, False),
        ("Is 0.5 close?", "5", TWO_STEP, False),
        ("Is it 1/5?", "5", TWO_STEP, False),
        ("Is it .5?", "5", TWO_STEP, False),
        ("What's 5x + 3 when x is 1?", "5", TWO_STEP, False),  # 5x is a coefficient
        ("Try subtracting 4 from both sides.", "5", TWO_STEP, False),
        ("Take 15 seconds and look again.", "5", TWO_STEP, False),
    ],
)
def test_states_answer(text: str, answer: str, problem: str, expected: bool) -> None:
    assert states_answer(text, answer, problem) is expected


@pytest.mark.parametrize(
    ("probe_id", "text", "expected"),
    [
        # "What do you add to x - 4 to get back to x?" The 4 in the problem may be restated or
        # referred to, but an explicit reveal phrase, or the 4 used as the answer, is a leak.
        ("inverse_operations.1", "The answer is 4.", True),
        ("inverse_operations.1", "It's 4.", True),
        ("inverse_operations.1", "So you add 4.", True),
        ("inverse_operations.1", "x - 4 + 4 = x", True),
        ("inverse_operations.1", "Look at x - 4: the answer is 4.", True),
        ("inverse_operations.1", "Look at x - 4 again.", False),
        ("inverse_operations.1", "What undoes subtracting 4?", False),
        ("inverse_operations.2", "Multiply by 5.", True),
        ("inverse_operations.2", "What undoes dividing by 5?", False),
        ("inverse_operations.2", "Look at x/5 again.", False),
        ("order_of_operations.1", "So it equals 2.", True),
        ("order_of_operations.1", "Look at the (4 + 2) part first.", False),
        ("order_of_operations.1", "Adding 2 to 4 gives 6.", False),
        # Answer -9 for "What do you add to x + 9 to get back to x?": subtracting 9 is adding -9.
        ("inverse_operations.3", "Subtract 9 from both sides.", True),
        ("inverse_operations.3", "What undoes adding 9?", False),
        # Answer 5 for "Solve 5x - 2x + 6 = 21.": "5 - 2" refers to the coefficients in 5x - 2x.
        ("multi_step_equations.1", "What's 5 - 2?", False),
    ],
)
def test_reveal_phrase_is_a_leak_even_when_the_problem_holds_the_answer(
    probe_id: str, text: str, expected: bool
) -> None:
    probe = SHIPPED[probe_id]
    assert states_answer(text, probe.answer, probe.prompt) is expected


@pytest.mark.parametrize(
    ("text", "answer", "problem", "expected"),
    [
        ("3x - 12", "3*x - 12", "Expand 3(x - 4).", True),
        ("-12 + 3x", "3*x - 12", "Expand 3(x - 4).", True),
        ("3x -\n\t12", "3*x - 12", "Expand 3(x - 4).", True),  # whitespace normalized
        ("3 * x \u2212 12", "3*x - 12", "Expand 3(x - 4).", True),
        ("So 3(x - 4) becomes 3x - 12.", "3*x - 12", "Expand 3(x - 4).", True),
        ("Expand 3(x - 4) (you should get 3x - 12)", "3*x - 12", "Expand 3(x - 4).", True),
        ("Simplify 2(3x).", "6*x", "Simplify 2(3x).", False),  # a one-term answer, restated
        ("It's 6x.", "6*x", "Simplify 2(3x).", True),
        ("What is 6x/2?", "3*x", "Simplify 6x/2.", False),
        ("Expand 3(x - 4).", "3*x - 12", "Expand 3(x - 4).", False),  # the problem, restated
        ("What's 3 times x?", "3*x - 12", "Expand 3(x - 4).", False),
        ("3x - 13", "3*x - 12", "Expand 3(x - 4).", False),
        ("-3x + 6", "6 - 3*x", "Simplify 2(x + 3) - 5x.", True),
        ("2x + 6 - 5x", "6 - 3*x", "Simplify 2(x + 3) - 5x.", False),  # a partial step
        ("2(n + 3)", "2*(n + 3)", "Write an expression for twice the sum of n and 3.", True),
        # Equivalent but written with other terms: a known gap, not a leak.
        ("2n + 6", "2*(n + 3)", "Write an expression for twice the sum of n and 3.", False),
    ],
)
def test_states_expression_answer(text: str, answer: str, problem: str, expected: bool) -> None:
    assert states_answer(text, answer, problem) is expected


@pytest.mark.parametrize("probe", SHIPPED.values(), ids=lambda probe: probe.id)
def test_restating_a_shipped_probe_is_not_a_leak(probe: ProbeProblem) -> None:
    assert not states_answer(probe.prompt, probe.answer, probe.prompt)


@pytest.mark.parametrize("probe", SHIPPED.values(), ids=lambda probe: probe.id)
def test_stating_a_shipped_probe_answer_is_a_leak(probe: ProbeProblem) -> None:
    text = f"So {probe.variable} = {probe.answer}." if probe.variable else f"It's {probe.answer}."
    assert states_answer(text, probe.answer, probe.prompt)


@pytest.mark.parametrize(
    "text",
    ["", "?!", "__import__('os').system('x')", "9**9**9**9", "x.n((((", "1+" * 5000 + "1"],
)
def test_states_answer_never_raises_on_prose(text: str) -> None:
    assert states_answer(text, "5", TWO_STEP) is False
