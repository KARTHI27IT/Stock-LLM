import { useEffect, useState } from "react";
import axios from "axios";

function Table() {
  const [reportText, setReportText] = useState('');
  const [reportSections, setReportSections] = useState({});
  const [pdfPath, setPdfPath] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const email = localStorage.getItem("userEmail");

  const expectedTitles = {
    summary: 'Summary & Portfolio Characteristics',
    grade: 'Goal Alignment Grade',
    percentage: 'Goal Alignment Percentage',
    risk: 'Risk Meter',
    return: 'Estimated 5-Year Return',
    strengths: 'Where You Are Strong',
    weaknesses: 'Where You Need to Improve',
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const payload = { email };
        const result = await axios.post(`${API_BASE}/user/details`, payload);

        const user = result.data.user;
        console.log(user);
        setReportText(user.reportData || 'No report data available.');
        setPdfPath(user.reportPdf || '');
        setUserName(user.name || '');

        const parsed = parseStructuredReport(user.reportData || '');
        setReportSections(parsed);
      } catch (error) {
        console.error("Error fetching report:", error);
        setReportText('❌ Error fetching report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [email]);

  const handleDownload = () => {
    if (pdfPath) {
      window.open(`${API_BASE}/${pdfPath}`, '_blank');
    } else {
      alert('❌ PDF not available');
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
      }
    }

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  return (
    <div className="container p-5 mt-4">
      <h2>📄 User Report</h2>
      {loading ? (
        <p>⏳ Loading report...</p>
      ) : (
        <>
          <p><strong>👤 User:</strong> {userName}</p>

          {Object.keys(reportSections).length > 0 ? (
            <div className="mt-4 p-3 border rounded bg-light position-relative">
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
          ) : (
            <div className="bg-warning-subtle mt-3 p-3 border rounded">
              <h5 className="text-danger">⚠️ Report parsing failed, showing raw output:</h5>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{reportText}</pre>
            </div>
          )}

          <button
            className="btn btn-primary mt-3"
            onClick={handleDownload}
            disabled={!pdfPath}
          >
            📥 Download PDF Report
          </button>
        </>
      )}
    </div>
  );
}

export default Table;
