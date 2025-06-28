import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Chart from "react-apexcharts";

function StockDetails() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [investedDates, setInvestedDates] = useState({});
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
    assets: 'Asset Allocation Breakdown'
  };

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const result = await axios.post(`${API_BASE}/user/details`, { email });
        const user = result.data.user;
        setUserName(user.name || '');

        const foundReport = user.reports.find(r => r._id === reportId);
        if (!foundReport) throw new Error("Report not found");

        const parsed = parseStructuredReport(foundReport.reportData || '');
        setReport({ ...foundReport, sections: parsed });
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
      assets: /^8\.\s*\*Asset\s*Allocation\s*Breakdown\*/i
    };

    let currentSection = null;
    let currentContent = [];

    for (let line of lines) {
      const trimmedLine = line.trim();
      let foundSection = null;

      for (const [key, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine)) {
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

  const handleDownload = () => {
    if (report?.reportPdf) {
      window.open(`${API_BASE}/${report.reportPdf}`, '_blank');
    } else {
      alert("❌ PDF not available");
    }
  };

const getPieChartData = () => {
  const assets = parseAssetTable(report.sections.assets || '');

  const series = assets.map(asset => {
    const num = parseFloat(asset.invested.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : num;
  });

  const labels = assets.map(asset => asset.name || "Unknown");
  return { series, labels };
};


  if (loading) return <p className="text-center mt-5">⏳ Loading...</p>;
  if (!report) return <p className="text-center mt-5 text-danger">⚠️ Report not found.</p>;

  const { series, labels } = getPieChartData();
  const assets = parseAssetTable(report.sections.assets || '');

  

  return (
    <div className="container p-5 mt-4">
      <h2>📄 User Report</h2>
      <p><strong>👤 User:</strong> {userName}</p>
      <p><strong>🧾 Report Name:</strong> {report.reportName}</p>

      <div className="mt-4 p-3 border rounded bg-light position-relative">
        <h4 className="mb-3">📋 Portfolio Report Sections</h4>

        {Object.entries(expectedTitles).map(([key, label]) => (
          key !== 'assets' ? (
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
          ) : null
        ))}

        {report.sections.assets && (
          <div className="mb-4">
            <h5 className="text-primary">Asset Allocation Breakdown</h5>
            <table className="table table-bordered table-striped text-center align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Amount Invested</th>
                  <th>Current Value</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((row, idx) => (
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
        )}

        <button
          className="btn btn-primary mt-3"
          onClick={handleDownload}
          disabled={!report.reportPdf}
        >
          📥 Download PDF Report
        </button>

        {series.length > 0 && (
          <div className="mt-5">
            <h4 className="text-success mb-3">📊 Asset Allocation Chart</h4>
            <Chart
              options={{
                chart: { type: 'pie' },
                labels: labels,
                legend: { position: 'bottom' },
title: {
  text: 'Portfolio Distribution (Invested Amount)',
  align: 'center',
  style: { fontSize: '20px' }
}

              }}
              series={series}
              type="pie"
              height={350}
            />
          </div>
        )}

        {/* 📅 Modal to input investment dates */}
        <button type="button" className="btn btn-primary mt-4" data-bs-toggle="modal" data-bs-target="#exampleModal">
          Compare stocks with Nifty
        </button>

        <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-5" id="exampleModalLabel">Enter Investment Dates</h1>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                {assets.map((row, idx) => (
                  <div className="mb-3 row align-items-center" key={idx}>
                    <div className="col-md-4 fw-semibold">{row.name}</div>
                    <div className="col-md-8">
                      <input
                        type="date"
                        className="form-control"
                        value={investedDates[row.name] || ''}
                        onChange={(e) =>
                          setInvestedDates({ ...investedDates, [row.name]: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => console.log("📤 Submitted Dates:", investedDates)}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

export default StockDetails;
