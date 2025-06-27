import { useState } from 'react';

function Dashboard() {
  const [goal, setGoal] = useState('');
  const [file, setFile] = useState(null);
  const [reportSections, setReportSections] = useState({});
  const [rawReport, setRawReport] = useState('');
  const [styledGrade, setStyledGrade] = useState('');
  const [loading, setLoading] = useState(false);

  const expectedTitles = {
    summary: 'Summary & Portfolio Characteristics',
    grade: 'Goal Alignment Grade',
    percentage: 'Goal Alignment Percentage',
    risk: 'Risk Meter',
    return: 'Estimated 5-Year Return',
    strengths: 'Where You Are Strong',
    weaknesses: 'Where You Need to Improve',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!goal || !file) {
      alert('Please provide a goal and a screenshot.');
      return;
    }

    const formData = new FormData();
    formData.append('goal', goal);
    formData.append('screenshot', file);

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/generate-report', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const report = data.report;
      setRawReport(report);

      // Extract styled grade block
      const gradeMatch = report.match(/<div[^>]*>Grade:\s*.*?<\/div>/i);
      const gradeBlock = gradeMatch ? gradeMatch[0] : '';
      setStyledGrade(gradeBlock);

      // Clean the report by removing grade block
      const cleanedReport = report.replace(gradeBlock, '').trim();

      // Parse sections
      const parsed = parseStructuredReport(cleanedReport);
      setReportSections(parsed);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseStructuredReport = (report) => {
    const sections = {};
    const lines = report.split('\n');

    const sectionPatterns = {
      summary: /^1\.\s*\*\*Summary\s*&\s*Portfolio\s*Characteristics\*\*/i,
      grade: /^2\.\s*\*\*Goal\s*Alignment\s*Grade\*\*/i,
      percentage: /^3\.\s*\*\*Goal\s*Alignment\s*Percentage\*\*/i,
      risk: /^4\.\s*\*\*Risk\s*Meter\*\*/i,
      return: /^5\.\s*\*\*Estimated\s*5[-\s]?Year\s*Return\*\*/i,
      strengths: /^6\.\s*\*\*Where\s*You\s*Are\s*Strong\*\*/i,
      weaknesses: /^7\.\s*\*\*Where\s*You\s*Need\s*to\s*Improve\*\*/i,
    };

    let currentSection = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      let foundSection = null;
      for (const [key, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine)) {
          foundSection = key;
          break;
        }
      }

      if (foundSection) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = foundSection;
        currentContent = [line];
      } else if (currentSection) {
        currentContent.push(line);

        if (
          trimmedLine.match(/^\d+\.\s*\*\*.*\*\*$/) &&
          !Object.values(sectionPatterns).some((p) => p.test(trimmedLine))
        ) {
          break;
        }
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  return (
    <div className="container p-lg-5 mt-5 mx-auto outer">
      <h1>📊 Stock LLM Report Generator</h1>
      <form className="main" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="goal" className="form-label">Goal</label>
          <input
            className="form-control"
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Long-term growth, retirement planning..."
          />
        </div>

        <div className="mb-3">
          <label htmlFor="formFile" className="form-label">Stock Screenshot</label>
          <input
            className="form-control"
            type="file"
            id="formFile"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <button className="button" type="submit" disabled={loading}>
          {loading ? '⏳ Generating...' : '🚀 Generate Report'}
        </button>
      </form>

      {!loading && Object.keys(reportSections).length > 0 && (
        <div className="mt-4 p-3 border rounded bg-light position-relative">
          {/* ✅ Grade in top-right corner */}
          {styledGrade && (
            <div
              className="grade-stamp"
              dangerouslySetInnerHTML={{ __html: styledGrade }}
            />
          )}

          <h4 className="mb-3">📋 Generated Portfolio Report</h4>
          {Object.entries(expectedTitles).map(([key, label]) => (
            <div key={key} className="mb-4">
              <h5 className="text-primary">{label}</h5>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {reportSections[key] ? (
                  reportSections[key].split('\n').slice(1).join('\n').trim() ||
                  <span className="text-warning">No content found for this section.</span>
                ) : (
                  <span className="text-danger">Missing section in report.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && rawReport && Object.keys(reportSections).length === 0 && (
        <div className="mt-4 p-3 border rounded bg-warning-subtle">
          <h5 className="text-danger">⚠️ Report parsing failed, showing raw output:</h5>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{rawReport}</pre>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && rawReport && (
        <div className="mt-4 p-3 border rounded bg-info-subtle">
          <h6>Debug Info:</h6>
          <p>Parsed sections: {Object.keys(reportSections).join(', ')}</p>
          <details>
            <summary>Raw Report</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8em' }}>{rawReport}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
