import { useState, useEffect } from "react";
import Alert from "./alert";
import "@fortawesome/fontawesome-free/css/all.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface MeetingRoom {
  id: string;
  name: string;
  meetings: Meeting[];
}

interface Participant {
  id: string;
  name: string;
}

function RoomSchedule(props) {
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<MeetingRoom | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    startTime: "",
    endTime: "",
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [showError, setShowError] = useState(false);
  const [overlapError, setOverlapError] = useState(false);

  // New states for modals
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingRoom, setSelectedMeetingRoom] =
    useState<MeetingRoom | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipant, setNewParticipant] = useState({ name: "" });
  const [savedParticipants, setSavedParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  // Generate time slots from 8 AM to 6 PM in 30-minute intervals
  useEffect(() => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 18) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    fetchMeetingRooms();
  }, [selectedDate]);

  // Load participants when meeting modal opens
  useEffect(() => {
    if (selectedMeeting && showMeetingModal) {
      loadParticipants();
    }
  }, [selectedMeeting, showMeetingModal]);

  const getMeetingsCountForSelectedDate = (meetings: Meeting[]) => {
    const sameDayMeetings = meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate.toDateString() === selectedDate.toDateString();
    });
    return sameDayMeetings.length;
  };

  const validateMeetingTimes = (meeting: {
    startTime: string;
    endTime: string;
  }) => {
    if (!meeting.startTime || !meeting.endTime) return true;

    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    return startTime < endTime;
  };

  const validateMeetingHours = (meeting: {
    startTime: string;
    endTime: string;
  }) => {
    if (!meeting.startTime || !meeting.endTime) return false;

    const startHour = new Date(meeting.startTime).getHours();
    const endHour = new Date(meeting.endTime).getHours();
    return startHour >= 8 && startHour <= 18 && endHour >= 8 && endHour <= 18;
  };

  const checkMeetingOverlap = (
    room: MeetingRoom,
    newMeeting: { startTime: string; endTime: string }
  ) => {
    if (!newMeeting.startTime || !newMeeting.endTime) return false;

    const newStart = new Date(newMeeting.startTime);
    const newEnd = new Date(newMeeting.endTime);

    return room.meetings.some((existingMeeting) => {
      const existingStart = new Date(existingMeeting.startTime);
      const existingEnd = new Date(existingMeeting.endTime);
      return newStart < existingEnd && newEnd > existingStart;
    });
  };

  useEffect(() => {
    if (newMeeting.startTime && newMeeting.endTime) {
      const isValid = validateMeetingTimes(newMeeting);
      setShowError(!isValid);

      if (currentRoom && isValid) {
        const hasOverlap = checkMeetingOverlap(currentRoom, newMeeting);
        setOverlapError(hasOverlap);
      } else {
        setOverlapError(false);
      }
    } else {
      setShowError(false);
      setOverlapError(false);
    }
  }, [newMeeting.startTime, newMeeting.endTime, currentRoom]);

  const fetchMeetingRooms = async () => {
    try {
      const response = await fetch(
        `http://${props.host}:5000/api/meeting-rooms`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMeetingRooms(data);
      setError(null);
    } catch (error) {
      console.error("Error loading meeting rooms:", error);
      setError("Failed to load meeting rooms. Please try again later.");
    }
  };

  const loadParticipants = async () => {
    if (!selectedMeeting) return;

    setIsLoadingParticipants(true);
    try {
      const response = await fetch(
        `http://${props.host}:5000/api/meetings/${selectedMeeting.id}/participants`
      );

      if (response.ok) {
        const participantsData = await response.json();
        setSavedParticipants(participantsData);
      }
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const saveParticipants = async () => {
    if (!selectedMeeting) return false;

    try {
      const response = await fetch(
        `http://${props.host}:5000/api/meetings/${selectedMeeting.id}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setSavedParticipants(result.participants);
        return true;
      }
    } catch (error) {
      console.error("Error saving participants:", error);
    }
    return false;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // New function to calculate meeting position and width
  const getMeetingStyle = (meeting: Meeting) => {
    const meetingStart = new Date(meeting.startTime);
    const meetingEnd = new Date(meeting.endTime);

    // Calculate position based on time
    const startMinutes =
      meetingStart.getHours() * 60 + meetingStart.getMinutes();
    const endMinutes = meetingEnd.getHours() * 60 + meetingEnd.getMinutes();
    const duration = endMinutes - startMinutes;

    // Calculate position from 8:00 AM (480 minutes)
    const positionFromStart = startMinutes - 480; // 8:00 AM = 480 minutes

    // Calculate percentage position and width
    const totalMinutes = 600; // 8:00 AM to 6:00 PM = 10 hours = 600 minutes
    const left = (positionFromStart / totalMinutes) * 100;
    const width = (duration / totalMinutes) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100, width)}%`,
      position: "absolute",
      top: "2px",
      bottom: "2px",
      zIndex: 1,
    };
  };

  // New function to get meetings for the selected date
  const getMeetingsForSelectedDate = (room: MeetingRoom) => {
    return room.meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate.toDateString() === selectedDate.toDateString();
    });
  };

  const handleRoomClick = (room: MeetingRoom) => {
    setCurrentRoom(room);
    setShowRoomForm(true);
    setPickDate(true);
    setOverlapError(false);
  };

  // New function to handle time slot click
  const handleTimeSlotClick = (room: MeetingRoom, meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setSelectedMeetingRoom(room);
    setShowMeetingModal(true);
  };

  // New function to handle meeting deletion
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting || !selectedMeetingRoom) return;

    try {
      const res = await fetch(
        `http://${props.host}:5000/api/meeting-rooms/${selectedMeeting.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Could not delete meeting on server");

      await fetchMeetingRooms();
      setShowMeetingModal(false);
      setSelectedMeeting(null);
      setSelectedMeetingRoom(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting meeting from server.");
    }
  };

  // Updated function to handle participants modal opening
  const handleParticipantsModalOpen = () => {
    // Load saved participants into the current participants list
    if (savedParticipants.length > 0) {
      setParticipants([...savedParticipants]);
    } else {
      setParticipants([]);
    }
    setShowMeetingModal(false);
    setShowParticipantsModal(true);
  };

  // Alternative PDF generation function using jsPDF
  const createAndDownloadPDF = async () => {
    if (!selectedMeeting || !selectedMeetingRoom) return;

    try {
      // Create a temporary div to hold our PDF content
      const pdfContent = document.createElement("div");
      pdfContent.style.position = "absolute";
      pdfContent.style.left = "-9999px";
      pdfContent.style.padding = "20px";
      pdfContent.style.backgroundColor = "white";
      pdfContent.style.color = "black";
      pdfContent.style.fontFamily = "Arial, sans-serif";

      const meetingDate = new Date(selectedMeeting.startTime);
      const formattedDate = meetingDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      const formattedStartTime = meetingDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(selectedMeeting.endTime);
      const formattedEndTime = endTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const participantList =
        participants.length > 0
          ? participants.map((p) => `• ${p.name}`).join("<br>")
          : "• No participants added";

      pdfContent.innerHTML = `
      <div style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color: #502171; margin: 0; font-size: 24px;">Meeting Details</h1>
      </div>
     
      <div style="margin-bottom: 20px;">
        <h2 style="color: #2a0e3f; margin: 0 0 10px 0; font-size: 20px;">${
          selectedMeeting.title
        }</h2>
        <p style="margin: 5px 0;"><strong>Room:</strong> ${
          selectedMeetingRoom.name
        }</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
      </div>
     
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2a0e3f; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: 16px;">Participants</h3>
        <div style="margin-top: 10px;">${participantList}</div>
      </div>
     
      <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        Generated on: ${new Date().toLocaleString()}
      </div>
    `;

      document.body.appendChild(pdfContent);

      // Convert to canvas then to PDF
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `Meeting-${selectedMeeting.title.replace(
          /[^a-z0-9]/gi,
          "-"
        )}-${formattedDate.replace(/[^a-z0-9]/gi, "-")}.pdf`
      );

      // Clean up
      document.body.removeChild(pdfContent);

      // Close modals
      setShowParticipantsModal(false);
      setShowMeetingModal(false);
      setParticipants([]);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Participant management functions
  const addParticipant = () => {
    if (newParticipant.name.trim()) {
      const participant: Participant = {
        id: Date.now().toString(),
        name: newParticipant.name,
      };
      setParticipants([...participants, participant]);
      setNewParticipant({ name: "" });
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const handleAddMeeting = async () => {
    if (!currentRoom) return;

    if (!validateMeetingTimes(newMeeting)) {
      setShowError(true);
      return;
    }

    if (checkMeetingOverlap(currentRoom, newMeeting)) {
      setOverlapError(true);
      return;
    }

    try {
      const res = await fetch(`http://${props.host}:5000/api/meeting-rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: currentRoom.id,
          title: newMeeting.title,
          startTime: newMeeting.startTime,
          endTime: newMeeting.endTime,
        }),
      });

      if (!res.ok) throw new Error("Failed to add meeting to server");

      await fetchMeetingRooms();
      setNewMeeting({ title: "", startTime: "", endTime: "" });
      setShowRoomForm(false);
      setPickDate(false);
      setCurrentRoom(null);
      setOverlapError(false);
    } catch (err) {
      console.error(err);
      alert("Error adding meeting to server.");
    }
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <h2>Room Schedule</h2>
            {!pickDate && (
              <div className="sus-rooms">
                <button
                  className="btn-sus btn-outline-secondary me-2"
                  onClick={() => navigateDate(-1)}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="mx-3">{formatDate(selectedDate)}</span>
                <button
                  className="btn-sus btn-outline-secondary me-4"
                  onClick={() => navigateDate(1)}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!showRoomForm ? (
        <div className="row">
          <div className="col">
            <div
              className="table-responsive"
              style={{
                overflow: "auto",
                maxWidth: "100%",
                maxHeight: "50vh",
                WebkitOverflowScrolling: "touch",
                borderRadius: "4px",
              }}
            >
              <table
                className="table table-bordered"
                style={{
                  minWidth: "1200px",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr>
                    <th className="row-room" style={{ width: "200px" }}>
                      Room
                    </th>
                    {timeSlots.map((slot) => (
                      <th
                        key={slot}
                        className="text-center"
                        style={{ width: "60px" }}
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meetingRooms.map((room) => {
                    const todaysMeetings = getMeetingsForSelectedDate(room);

                    return (
                      <tr
                        key={room.id}
                        style={{ position: "relative", height: "60px" }}
                      >
                        <td
                          className="room-name"
                          style={{
                            cursor: "pointer",
                            position: "relative",
                            zIndex: 0,
                          }}
                          onClick={() => handleRoomClick(room)}
                          title="Click to add a meeting"
                        >
                          <strong>{room.name}</strong>
                          <br />
                          <small className="text-muted">
                            {todaysMeetings.length > 0
                              ? `${todaysMeetings.length} meeting${
                                  todaysMeetings.length !== 1 ? "s" : ""
                                }`
                              : "No meetings"}
                          </small>
                        </td>

                        {/* Time slot cells */}

                        {/* Meeting blocks - positioned over the entire row */}
                        {todaysMeetings.map((meeting) => {
                          const style = getMeetingStyle(meeting);
                          return (
                            <div
                              key={meeting.id}
                              style={{
                                ...style,
                                backgroundColor: "rgba(220, 53, 69, 0.8)",
                                border: "1px solid #dc3545",
                                borderRadius: "4px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                color: "white",
                                fontWeight: "bold",
                                padding: "2px 4px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                pointerEvents: "auto",
                              }}
                              title={`${meeting.title} (${new Date(
                                meeting.startTime
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} - ${new Date(
                                meeting.endTime
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTimeSlotClick(room, meeting);
                              }}
                            >
                              {meeting.title}
                            </div>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // ... (the rest of your form code remains the same)
        <div className="row justify-content-center">
          <div className="mt-4">
            <h4>Add Meeting for {currentRoom?.name}</h4>
            <div className="row g-2">
              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="text"
                    placeholder="Title"
                    value={newMeeting.title}
                    onChange={(e) =>
                      setNewMeeting({ ...newMeeting, title: e.target.value })
                    }
                    className="form-control"
                  />
                  <label>Meeting Title</label>
                </div>
              </div>

              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="datetime-local"
                    placeholder="Start Time"
                    value={newMeeting.startTime}
                    onChange={(e) =>
                      setNewMeeting({
                        ...newMeeting,
                        startTime: e.target.value,
                      })
                    }
                    className="form-control"
                  />
                  <label>Start Time</label>
                </div>
              </div>

              <div className="col-md">
                <div className="form-floating">
                  <input
                    type="datetime-local"
                    placeholder="End Time"
                    value={newMeeting.endTime}
                    onChange={(e) =>
                      setNewMeeting({ ...newMeeting, endTime: e.target.value })
                    }
                    className="form-control"
                  />
                  <label>End Time</label>
                </div>
              </div>
            </div>

            {showError && (
              <Alert onClose={() => setShowError(false)}>
                Sfarsitul unui meeting nu poate fi inaintea inceputului.
              </Alert>
            )}

            {overlapError && (
              <Alert onClose={() => setOverlapError(false)}>
                Time slot ocupat.
              </Alert>
            )}

            <button
              className="btn-add btn-primary mt-2"
              onClick={handleAddMeeting}
              disabled={
                !newMeeting.title ||
                !newMeeting.startTime ||
                !newMeeting.endTime ||
                !validateMeetingHours(newMeeting) ||
                !validateMeetingTimes(newMeeting) ||
                overlapError
              }
            >
              Add Meeting
            </button>
            <button
              className="btn-add btn-primary mt-2 ms-2"
              onClick={() => {
                setShowRoomForm(false);
                setPickDate(false);
                setCurrentRoom(null);
                setNewMeeting({ title: "", startTime: "", endTime: "" });
                setOverlapError(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rest of your modals remain exactly the same */}
      {/* Meeting Action Modal */}
      {showMeetingModal && selectedMeeting && (
        <div className="modal-overlay">
          <div className="url-modal">
            <div className="modal-header">
              <h3>Meeting Actions</h3>
              <button
                className="modal-close"
                onClick={() => setShowMeetingModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="meeting-info">
                <h2>{selectedMeeting.title}</h2>
                <p>
                  <strong>Room:</strong> {selectedMeetingRoom?.name}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date(selectedMeeting.startTime).toLocaleString()} -{" "}
                  {new Date(selectedMeeting.endTime).toLocaleString()}
                </p>
                <p>
                  <strong>Saved Participants:</strong>{" "}
                  {savedParticipants.length}
                  {isLoadingParticipants && (
                    <small className="text-muted ms-2">(Loading...)</small>
                  )}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={handleDeleteMeeting}
              >
                <i className="fas fa-trash me-2"></i>
                Delete Meeting
              </button>
              <button
                className="modal-btn modal-btn-submit"
                onClick={handleParticipantsModalOpen}
              >
                <i className="fas fa-file-pdf me-2"></i>
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && (
        <div className="modal-overlay">
          <div className="url-modal">
            <div className="modal-header">
              <h3>Add Participants for {selectedMeeting?.title}</h3>
              <button
                className="modal-close"
                onClick={async () => {
                  // Save participants when closing
                  await saveParticipants();
                  setShowParticipantsModal(false);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="participants-form">
                <div className="row g-2 mb-3">
                  <div className="col-md-12">
                    <input
                      type="text"
                      className="url-input"
                      placeholder="Participant Name"
                      value={newParticipant.name}
                      onChange={(e) =>
                        setNewParticipant({
                          ...newParticipant,
                          name: e.target.value,
                        })
                      }
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addParticipant();
                        }
                      }}
                    />
                  </div>
                </div>
                <button
                  className="modal-btn modal-btn-submit mb-3"
                  onClick={addParticipant}
                >
                  <i className="fas fa-plus me-2"></i>
                  Add Participant
                </button>

                <div className="participants-list">
                  <h5>Participants ({participants.length})</h5>
                  {participants.length === 0 ? (
                    <p className="text-muted">No participants added yet</p>
                  ) : (
                    participants.map((participant) => (
                      <div key={participant.id} className="participant-item">
                        <span>{participant.name}</span>
                        <button
                          className="action-btn"
                          onClick={() => removeParticipant(participant.id)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={async () => {
                  // Save participants when closing
                  await saveParticipants();
                  setShowParticipantsModal(false);
                }}
              >
                Save & Close
              </button>
              <button
                className="modal-btn modal-btn-submit"
                onClick={createAndDownloadPDF}
                disabled={participants.length === 0}
              >
                <i className="fas fa-download me-2"></i>
                Save & Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomSchedule;
