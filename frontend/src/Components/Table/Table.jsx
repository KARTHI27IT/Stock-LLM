import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Table() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const email = localStorage.getItem("userEmail");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const result = await axios.post(`${API_BASE}/user/details`, { email });
        const user = result.data.user;
        setReports(user.reports || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [email]);

  const handleDownload = (pdfPath) => {
    if (pdfPath) {
      window.open(`${API_BASE}/${pdfPath}`, '_blank');
    } else {
      alert('❌ PDF not available');
    }
  };

  const handleViewDetails = (reportId) => {
    navigate(`/stockDetails/${reportId}`);
  };

  if (loading) return <p className="text-center mt-5">Loading reports...</p>;

  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">📊 Your Reports</h2>
      {reports.length === 0 ? (
        <p className="text-center">No reports found.</p>
      ) : (
        <table className="table table-bordered table-hover">
          <thead className="table-dark">
            <tr>
              <th>S.no</th>
              <th>Report Name</th>
              <th>Download PDF</th>
              <th>More Details</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{report.reportName}</td>
                <td>
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleDownload(report.reportPdf)}
                  >
                    Download PDF
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleViewDetails(report._id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Table;
