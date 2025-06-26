import { useState } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [goal, setGoal] = useState('');
  const [file, setFile] = useState(null);
  const [report, setReport] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!goal || !file) {
      alert('Please provide a goal and a screenshot.');
      return;
    }

    const formData = new FormData();
    formData.append('goal', goal);
    formData.append('screenshot', file);

    const res = await fetch('http://localhost:5000/generate-report', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setReport(data.report);
  };

  return (
    <div className="container p-lg-5 mt-5 mx-auto outer">
      <h1>Stock LLM</h1>
      <form className="main" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="goal" className="form-label">Goal</label>
          <input
            className="form-control"
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Analyze profitability, suggest investments..."
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

        <button className="button" type="submit">Generate Report</button>
      </form>

      {report && (
        <div className="mt-4 p-3 border rounded bg-light">
          <h5>Generated Report</h5>
          <p>{report}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
