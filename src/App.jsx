import React, { useEffect, useState, useRef } from "react";
import YAML from "yaml";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import './App.css'
import { useCodeLanguage } from './contexts/CodeLanguageContext';

function App() {
  const QuestionCard = ({ children, faded = false }) => <div className={`card shadow-sm mb-3 ${faded ? "opacity-50" : ""}`}>{children}</div>

  const [config, setConfig] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [currentSubselected, setCurrentSubselected] = useState({});
  const { selectedLang, setSelectedLang } = useCodeLanguage();

  const pyodideRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (!pyodideRef.current && window.loadPyodide) {
        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
        });
        pyodideRef.current = pyodide;
        setPyodideLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetch("config.yaml")
      .then((response) => response.text())
      .then((rawText) => {
        const parsed = YAML.parse(rawText);
        setConfig(parsed);
        setCurrentQuestion(parsed.root_question_variable);
        document.title = parsed.tab_title || "Survey";
        setConfigLoading(false);
      });
  }, []);

  const getQuestion = (question) => config.question_variables[question];
  const getAnswersSet = (answer) => config.answer_text_variables[answer];
  const getOutcome = (outcomeText) => config.outcomes.find((o) => o.outcome_text === outcomeText);

  const handleSingleAnswer = (question, answer) => {
    setHistory(prev => [...prev, { question, answer, type: question.code ? "coding" : "single" }]);

    if (question.answer_logic) {
      const pyodide = pyodideRef.current;
      // convert answerValue to a number if it's numeric
      const answerValue = isNaN(answer.answer_label) ? answer.answer_label : +answer.answer_label;
      pyodide.globals.set("answer", answerValue);
      const logicCode = `
def evaluate_logic(answer):
${question.answer_logic
          .split("\n")
          .map((line) => "  " + line)
          .join("\n")}

result = evaluate_logic(answer)
`;

      try {
        pyodide.runPython(logicCode);
        const result = pyodide.globals.get("result").toJs();

        if (result.outcome) {
          setOutcome(getOutcome(result.outcome));
          setCurrentQuestion(null);
        } else if (result.question_variable) {
          setCurrentQuestion(result.question_variable);
        } else {
          console.error("Answer logic returned unexpected result:", result);
        }
      } catch (e) {
        console.error("Error running Pyodide logic:", e);
      }
    } else if (answer.outcome) {
      setOutcome(getOutcome(answer.outcome));
      setCurrentQuestion(null);
    } else if (answer.question_variable) {
      setCurrentQuestion(answer.question_variable);
    } else {
      console.error("Answer has no outcome or next question defined.");
    }
  };

  const handleSubSelect = (label, text, value) => setCurrentSubselected(prev => ({ ...prev, [label]: [text, value] }));

  useEffect(() => {
    if (!currentQuestion || !pyodideRef.current) return;

    const question = getQuestion(currentQuestion);
    if (!question || !question.subquestions) return;

    if (Object.keys(currentSubselected).length !== question.subquestions.length) return;

    setHistory((prev) => [
      ...prev,
      { question, answer: currentSubselected, type: "sub" },
    ]);

    const pyodide = pyodideRef.current;

    const subquestions = {};
    for (const [label, [_text, value]] of Object.entries(currentSubselected)) {
      subquestions[label] = Number(value);
    }

    // Inject variables into Python
    pyodide.globals.set("subquestions", subquestions);

    const logicCode = `
def evaluate_logic(subquestions):
${question.subquestions_logic
        .split("\n")
        .map((line) => "  " + line)
        .join("\n")}

result = evaluate_logic(subquestions.to_py())
`;

    try {
      pyodide.runPython(logicCode);
      const result = pyodide.globals.get("result").toJs();

      if (result.outcome) {
        setOutcome(getOutcome(result.outcome));
        setCurrentQuestion(null);
      } else if (result.question_variable) {
        setCurrentQuestion(result.question_variable);
      } else {
        console.error("Subquestion logic returned unexpected result:", result);
      }
    } catch (e) {
      console.error("Error running Pyodide logic:", e);
    } finally {
      setCurrentSubselected({});
    }
  }, [currentSubselected, currentQuestion]);

  const handleReset = () => {
    setHistory([]);
    setOutcome(null);
    setCurrentQuestion(config?.root_question_variable || null);
    setCurrentSubselected({});
  };

  const renderSingleQuestion = (question, disabled = false, chosen = null) => {
    if (question.answers) {
      return (<>
        {question.answers.map((answer, i) => (
          <button
            key={i}
            className={`btn btn-${chosen === answer.answer_text ? "secondary" : "primary"} w-100 mb-2`}
            disabled={disabled}
            onClick={() => handleSingleAnswer(question, answer)}
          >
            {answer.answer_text}
          </button>
        ))}
      </>);
    } else if (question.answers_variable) {
      return (
        <div className="d-flex flex-column">
          {getAnswersSet(question.answers_variable).map((answer, i) => (
            <button
              key={i}
              className={`btn btn-${chosen === answer.answer_text ? "secondary" : "primary"} w-100 mb-2`}
              disabled={disabled}
              onClick={() => handleSingleAnswer(question, answer)}
            >
              {answer.answer_text}
            </button>
          ))}
        </div>
      );
    } else {
      console.error("Question has no answers or answers_variable defined.");
      return null;
    }
  };

  const renderSubquestions = (question, disabled = false) => (
    <>
      {question.subquestions.map((subquestion) => (
        <div className="mb-3" key={subquestion.subquestion_label}>
          <p>{subquestion.question_text}</p>
          <div className="d-flex mt-2">
            {getAnswersSet(subquestion.answers_variable).map(answer => (
              <button
                key={`subquestion-${subquestion.subquestion_label}-${answer.answer_label}`}
                className={`btn btn-sm mx-1 ${currentSubselected[subquestion.subquestion_label]?.[1] === answer.answer_label ? "btn-primary" : "btn-outline-primary"}`}
                disabled={disabled}
                onClick={() => handleSubSelect(subquestion.subquestion_label, answer.answer_text, answer.answer_label)}
              >
                {answer.answer_text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  )

  const renderCoding = (question, disabled = false, stored = null) => {
    const codeLanguages = Object.keys(question.code || {}).filter(lang => lang !== "solution");

    // If the selectedLang is not available in this question, fallback to the first
    const effectiveLang = codeLanguages.includes(selectedLang)
      ? selectedLang
      : codeLanguages[0];

    return (
      <>
        {codeLanguages.length > 1 && (
          <div className="mb-3">
            <label className="form-label">Choose a language:</label>
            <select
              className="form-select"
              value={effectiveLang}
              onChange={(e) => setSelectedLang(e.target.value)}
            >
              {codeLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {effectiveLang && question.code[effectiveLang] && (
          <pre className="bg-light p-3">
            <code>{question.code[effectiveLang].trim()}</code>
          </pre>
        )}

        {question.code?.solution && (
          <details className="alert alert-info mt-3">
            <summary className="fw-bold" style={{ cursor: "pointer" }}>
              Toggle Solution
            </summary>
            <pre className="bg-light p-3 mt-2 mb-0">
              <code>{question.code.solution.trim()}</code>
            </pre>
          </details>
        )}

        {renderSingleQuestion(question, disabled, stored)}
      </>
    );
  };

  const renderLiveQuestion = () => {
    const question = getQuestion(currentQuestion);
    const questionText = question.question_text ||
      (question.question_text_variable && config.question_text_variables[question.question_text_variable]);

    return (
      <QuestionCard>
        <div className="card-body">
          <h5 className="card-title">{questionText}</h5>
          {question.answers && renderSingleQuestion(question)}
          {question.subquestions && renderSubquestions(question, false)}
          {question.code && renderCoding(question)}
        </div>
      </QuestionCard>
    );
  };

  const renderHistoryItem = (item, i) => {
    let singleQuestionText = "";
    if (item.type === "coding" && item.question.coding_question_label) {
      singleQuestionText = item.question.coding_question_label;
    } else if (item.question.question_text) {
      singleQuestionText = item.question.question_text;
    } else if (item.question.question_text_variable) {
      singleQuestionText = config.question_text_variables?.[item.question.question_text_variable];
    } else {
      console.error("Question has no text label defined.");
    }

    return (
      <QuestionCard key={i} faded>
        <div className="card-body">
          <h6 className="card-title mb-2">{singleQuestionText}</h6>
          {(item.type === "single" || item.type === "coding") && (
            <p className="mb-0">Answer: <strong>{item.answer.answer_text}</strong></p>
          )}
          {item.type === "sub" && (
            <table className="table table-sm mb-0">
              <tbody>
                {item.question.subquestions.map((subquestion, i) => {
                  return (
                    <tr key={i}>
                      <td>{subquestion.question_text}</td>
                      <td className="text-end text-truncate" style={{ maxWidth: "300px" }}><strong>{item.answer[subquestion.subquestion_label][0]}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </QuestionCard>
    );
  };

  if (configLoading) return <div className="text-center mt-5">Site loading…</div>;

  return (
    <div className="container py-5">
      <header className="mb-4 text-center">
        <h1>{config.page_title}</h1>
        <p className="lead">{config.page_description}</p>
      </header>

      {history.map(renderHistoryItem)}

      {outcome ? (
        <div className="alert alert-success" role="alert">
          <h2>Your recommended placement: <strong>{outcome.outcome_text}</strong></h2>
          <p>{outcome.outcome_description}</p>
        </div>
      ) : (
        pyodideLoading ? <div className="text-center mt-5">Loading Pyodide...</div> : renderLiveQuestion()
      )}

      <div className="text-center mt-5">
        <button className="btn btn-sm btn-outline-danger mt-2" onClick={handleReset}>
          Reset Survey
        </button>
      </div>
    </div>
  );
}

export default App
