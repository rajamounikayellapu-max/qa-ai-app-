import { useState } from "react";
import { UI_TEXT } from "../uiText";

const uiText = UI_TEXT;

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5100";

export default function SeleniumPage() {
  const [steps, setSteps] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setError("");
    setCopied(false);
    setScript("");

    if (!steps.trim()) {
      setError(uiText.seleniumPage.errorEmptySteps);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/generate-selenium-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server returned ${response.status}`);
      }

      const data = await response.json();
      setScript(data.script || "");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to generate script.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(uiText.seleniumPage.errorClipboard);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">{uiText.seleniumPage.eyebrow}</p>
          <h1>{uiText.seleniumPage.heading}</h1>
          <p className="page-description">
            {uiText.seleniumPage.description}
          </p>
        </div>
        <button className="primary-button" onClick={handleGenerate} disabled={loading}>
          {loading ? uiText.seleniumPage.generatingButton : uiText.seleniumPage.generateButton}
        </button>
      </div>

      <div className="form-card">
        <label htmlFor="steps" className="form-label">
          {uiText.seleniumPage.stepsLabel}
        </label>
        <textarea
          id="steps"
          className="textarea"
          rows="8"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder={uiText.seleniumPage.stepsPlaceholder}
        />
      </div>

      {error && <div className="page-alert error-text">{error}</div>}

      {script && (
        <div className="result-card">
          <div className="result-card-header">
            <h3>{uiText.seleniumPage.generatedTitle}</h3>
            <button className="secondary-button" onClick={handleCopy}>
              {copied ? uiText.seleniumPage.copySuccess : uiText.seleniumPage.copyButton}
            </button>
          </div>
          <pre className="code-block">{script}</pre>
        </div>
      )}
    </div>
  );
}
