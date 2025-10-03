import { useState, useEffect } from "react";

// Interfaces
interface Visitor {
  id: string;
  name: string;
  company: string;
  time: string;
  purpose: string;
  arrivalTime: string;
  departureTime?: string;
  status: "scheduled" | "finished";
}

// Component
function AgendaSystem(props) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [newVisitor, setNewVisitor] = useState({
    name: "",
    company: "",
    time: "",
    purpose: "",
  });
  const [showForm, setShowForm] = useState(false);

  // Load data
  useEffect(() => {
    fetch(`http://${props.host}:5000/api/visitors`)
      .then((response) => response.json())
      .then((data) => setVisitors(data))
      .catch((error) => console.error("Error loading visitors:", error));
  }, []);

  const handleEliminate = async (visitorId: string) => {
    const confirmDelete = window.confirm(
      "Sigur vrei să elimini acest vizitator?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `http://${props.host}:5000/api/visitors/${visitorId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok)
        throw new Error("Nu s-a putut elimina vizitatorul pe server.");

      setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
    } catch (err) {
      console.error(err);
      alert("Eroare la eliminarea vizitatorului de pe server.");
    }
  };

  const formatVisitorTime = (timeString: string) => {
    const visitDate = new Date(timeString);

    // Normalize dates to ignore time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const visitDay = new Date(visitDate);
    visitDay.setHours(0, 0, 0, 0);

    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };

    if (visitDay.getTime() === today.getTime()) {
      return `Today, ${visitDate.toLocaleTimeString([], options)}`;
    } else if (visitDay.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${visitDate.toLocaleTimeString([], options)}`;
    } else {
      const weekday = visitDate.toLocaleDateString(undefined, {
        weekday: "long",
      });
      return `${weekday}, ${visitDate.toLocaleTimeString([], options)}`;
    }
  };

  // Add visitor
  // Add visitor
  const handleAddVisitor = () => {
    const now = new Date();
    const visitTime = new Date(newVisitor.time);

    // Determine status based on time comparison
    const status = visitTime < now ? "finished" : "scheduled";

    const visitor: Visitor = {
      id: Date.now().toString(),
      name: newVisitor.name,
      company: newVisitor.company,
      time: newVisitor.time,
      purpose: newVisitor.purpose,
      arrivalTime: new Date().toLocaleTimeString(),
      status: status, // Set status based on time comparison
    };

    setNewVisitor({ name: "", company: "", time: "", purpose: "" });
    setShowForm(false); // Hide the form

    fetch(`http://${props.host}:5000/api/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitor),
    })
      .then((res) => res.json())
      .then((savedVisitor) => {
        setVisitors((prev) => [savedVisitor, ...prev].slice(0, 5));
      });
  };

  const renderVisitorTable = () => {
    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const filteredVisitors = visitors
      .filter((visitor) => {
        const visitDate = new Date(visitor.time);

        const start = new Date();
        start.setHours(0, 0, 0, 0); // start of today

        const end = new Date(start);
        end.setDate(start.getDate() + 2); // +2 days

        return visitDate >= start && visitDate <= end;
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return (
      <table className="table tb table-striped table-bordered">
        <thead>
          <tr>
            <th>Visitor</th>
            <th>Company</th>
            <th>Time</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {filteredVisitors.length > 0 ? (
            filteredVisitors
              .slice(-4)

              .map((visitor) => (
                <tr
                  key={visitor.id}
                  style={{ cursor: "pointer" }} // show clickable cursor
                  onClick={() => handleEliminate(visitor.id)}
                  title="Click to remove this visitor" // optional tooltip
                >
                  <td>{visitor.name}</td>
                  <td>{visitor.company}</td>
                  <td>{formatVisitorTime(visitor.time)}</td>
                  <td>{visitor.purpose}</td>
                </tr>
              ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center" }}>
                No visitors scheduled in 2 days
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };
  return (
    <div className="mt-4">
      <h2>Visitors Today</h2>

      {showForm && (
        <div className="mt-4">
          <h4>Add New Visitor</h4>
          <div className="row g-2">
            <div className="col-md">
              <div className="form-floating">
                <input
                  type="text"
                  placeholder="Name"
                  value={newVisitor.name}
                  onChange={(e) =>
                    setNewVisitor({ ...newVisitor, name: e.target.value })
                  }
                  className="form-control"
                />
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <input
                  type="text"
                  placeholder="Company"
                  value={newVisitor.company}
                  onChange={(e) =>
                    setNewVisitor({ ...newVisitor, company: e.target.value })
                  }
                  className="form-control"
                />
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <input
                  type="datetime-local"
                  placeholder="Time"
                  value={newVisitor.time}
                  onChange={(e) =>
                    setNewVisitor({ ...newVisitor, time: e.target.value })
                  }
                  className="form-control"
                />
              </div>
            </div>

            <div className="col-md">
              <div className="form-floating">
                <input
                  type="text"
                  placeholder="Purpose"
                  value={newVisitor.purpose}
                  onChange={(e) =>
                    setNewVisitor({ ...newVisitor, purpose: e.target.value })
                  }
                  className="form-control"
                />
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleAddVisitor}
            disabled={
              !newVisitor.name || !newVisitor.company || !newVisitor.time
            }
          >
            Add Visitor
          </button>
        </div>
      )}

      {/* Visitors List */}
      {/* Visitors List */}
      {!showForm && <div className="visitors-list">{renderVisitorTable()}</div>}

      <button
        className="btn-add btn-secondary"
        onClick={() => {
          if (showForm) {
            setNewVisitor({ name: "", company: "", time: "", purpose: "" });
          }
          setShowForm((prev) => !prev);
        }}
      >
        {showForm ? "Cancel" : "Add"}
      </button>
    </div>
  );
}

export default AgendaSystem;
