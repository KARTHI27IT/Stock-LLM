import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

function StockDetails() {
  const { reportId } = useParams(); // ✅ Get report ID from URL
  const [report, setReport] = useState(null);
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
        const result = await axios.post(`${API_BASE}/user/details`, { email });
        const user = result.data.user;
        setUserName(user.name || '');

        // ✅ Find the report with matching _id
        const foundReport = user.reports.find(r => r._id === reportId);
        if (!foundReport) throw new Error("Report not found");

        const parsed = parseStructuredReport(foundReport.reportData || '');

        setReport({
          ...foundReport,
          sections: parsed
        });
      } catch (error) {
        console.error("Error fetching or parsing report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [email, reportId]);

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
        if (currentSection && currentContent.length) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = foundSection;
        currentContent = [line];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection && currentContent.length) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  const handleDownload = () => {
    if (report?.reportPdf) {
      window.open(`${API_BASE}/${report.reportPdf}`, '_blank');
    } else {
      alert("❌ PDF not available");
    }
  };

  if (loading) return <p className="text-center mt-5">⏳ Loading...</p>;
  if (!report) return <p className="text-center mt-5 text-danger">⚠️ Report not found.</p>;

  return (
    <div className="container p-5 mt-4">
      <h2>📄 User Report</h2>
      <p><strong>👤 User:</strong> {userName}</p>
      <p><strong>🧾 Report Name:</strong> {report.reportName}</p>

      <div className="mt-4 p-3 border rounded bg-light position-relative">
        <h4 className="mb-3">📋 Portfolio Report Sections</h4>

        {Object.entries(expectedTitles).map(([key, label]) => (
          <div key={key} className="mb-4">
            <h5 className="text-primary">{label}</h5>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {report.sections[key] ? (
                report.sections[key].split('\n').slice(1).join('\n').trim() ||
                <span className="text-warning">No content found for this section.</span>
              ) : (
                <span className="text-danger">Missing section in report.</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary mt-3"
        onClick={handleDownload}
        disabled={!report.reportPdf}
      >
        📥 Download PDF Report
      </button>
    </div>
  );
}

export default StockDetails;
