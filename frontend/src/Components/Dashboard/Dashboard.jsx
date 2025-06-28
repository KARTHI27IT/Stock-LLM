import { useState } from 'react';

function Dashboard() {
  const [goal, setGoal] = useState('');
  const [files, setFiles] = useState([]);
  const [reportSections, setReportSections] = useState({});
  const [rawReport, setRawReport] = useState('');
  const [styledGrade, setStyledGrade] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const expectedTitles = {
    summary: 'Summary & Portfolio Characteristics',
    grade: 'Goal Alignment Grade',
    percentage: 'Goal Alignment Percentage',
    risk: 'Risk Meter',
    return: 'Estimated 5-Year Return',
    strengths: 'Where You Are Strong',
    weaknesses: 'Where You Need to Improve',
    assetBreakdown: 'Asset Allocation Breakdown',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!goal || files.length === 0) {
      alert('Please provide a goal and at least one screenshot.');
      return;
    }

    const formData = new FormData();
    formData.append('goal', goal);
    formData.append('email', localStorage.getItem('userEmail'));
    files.forEach(file => formData.append('screenshots', file));

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/generate-report`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      const report = data.report;
      setRawReport(report);

      const gradeMatch = report.match(/<div[^>]*>Grade:\s*.*?<\/div>/i);
      const gradeBlock = gradeMatch ? gradeMatch[0] : '';
      setStyledGrade(gradeBlock);

      const cleanedReport = report.replace(gradeBlock, '').trim();
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
      summary: /^1\.\s*\*Summary\s*&\s*Portfolio\s*Characteristics\*/i,
      grade: /^2\.\s*\*Goal\s*Alignment\s*Grade\*/i,
      percentage: /^3\.\s*\*Goal\s*Alignment\s*Percentage\*/i,
      risk: /^4\.\s*\*Risk\s*Meter\*/i,
      return: /^5\.\s*\*Estimated\s*5[-\s]?Year\s*Return\*/i,
      strengths: /^6\.\s*\*Where\s*You\s*Are\s*Strong\*/i,
      weaknesses: /^7\.\s*\*Where\s*You\s*Need\s*to\s*Improve\*/i,
      assetBreakdown: /^8\.\s*\*Asset\s*Allocation\s*Breakdown\*/i
    };

    let currentSection = null;
    let currentContent = [];

    for (let line of lines) {
      const trimmed = line.trim();
      let foundSection = null;
      for (const [key, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmed)) {
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
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };


const parseAssetTable = (text) => {
  const rows = text
    .split('\n')
    .map(line => line.trim())
    .filter(line =>
      line &&
      line.includes('|') &&
      !line.toLowerCase().includes('asset name') &&
      !line.includes('----')
    );

  const parsedRows = [];

  for (const row of rows) {
    const parts = row.split('|').map(cell => cell.trim()).filter(Boolean);
    if (parts.length === 4) {
      parsedRows.push({
        name: parts[0],
        type: parts[1],
        invested: parts[2],
        value: parts[3]
      });
    }
  }

  return parsedRows;
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
          <label htmlFor="formFile" className="form-label">Stock Screenshot(s)</label>
          <input
            className="form-control"
            type="file"
            id="formFile"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '⏳ Generating...' : '🚀 Generate Report'}
        </button>
      </form>

      {!loading && Object.keys(reportSections).length > 0 && (
        <div className="mt-4 p-3 border rounded bg-light position-relative">
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

              {key === 'assetBreakdown' ? (
                <div className="table-responsive bg-white p-2 rounded border">
                  <table className="table table-bordered text-center align-middle">
                    <thead className="table-dark">
                      <tr>
                        <th>Asset Name</th>
                        <th>Type</th>
                        <th>Amount Invested</th>
                        <th>Current Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseAssetTable(reportSections[key] || '').map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.name}</td>
                          <td>{row.type}</td>
                          <td>{row.invested}</td>
                          <td>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {reportSections[key]
                    ? reportSections[key].split('\n').slice(1).join('\n').trim()
                    : <span className="text-danger">Missing section in report.</span>}
                </div>
              )}
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
    </div>
  );
}

export default Dashboard;
