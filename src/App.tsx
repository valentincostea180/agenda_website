import AgendaSystem from "./components/agenda";
import RoomSchedule from "./components/rooms";
import Video from "./components/video";
import "./App.css";
import { useState } from "react";

function App() {
  const [showVisitors, setShowVisitors] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [tempUrl, setTempUrl] = useState("");

  const path = "localhost";

  // Function to convert YouTube URL to embedded format
  const convertToEmbedUrl = (url) => {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return "https://www.youtube.com/embed/r_zXfUt1xKU";
    return null;
  };

  const handleVideoToggle = () => {
    if (!showVideo) {
      // Show the modal instead of prompt
      setShowUrlModal(true);
    } else {
      // If we're switching back to agenda
      setShowVisitors(true);
      setShowMeetings(true);
      setShowVideo(false);
      setVideoUrl("");
    }
  };

  const handleUrlSubmit = () => {
    if (tempUrl) {
      const embedUrl = convertToEmbedUrl(tempUrl);
      if (embedUrl) {
        setVideoUrl(embedUrl);
        setShowVisitors(false);
        setShowMeetings(false);
        setShowVideo(true);
        setShowUrlModal(false);
        setTempUrl("");
      } else {
        alert("Please enter a valid YouTube URL");
      }
    }
  };

  const handleModalClose = () => {
    setShowUrlModal(false);
    setTempUrl("");
  };

  return (
    <div className="agenda-system">
      <div className="agenda-header">
        <h2>Company Agenda System</h2>
      </div>
      <div className="agenda-content">
        {showVisitors && (
          <div className="agenda-panel">
            <AgendaSystem host={path} />
          </div>
        )}
        {showMeetings && (
          <div className="meetings-panel">
            <RoomSchedule host={path} />
          </div>
        )}
        <button className="btn-tsx" onClick={handleVideoToggle}>
          {!showVideo ? "Video" : "Agenda"}
        </button>
        {showVideo && videoUrl && (
          <div className="meetings-panel">
            <Video videoUrl={videoUrl} />
          </div>
        )}
      </div>

      {/* URL Input Modal */}
      {showUrlModal && (
        <div className="modal-overlay">
          <div className="url-modal">
            <div className="modal-header">
              <h3>Enter YouTube Video URL</h3>
            </div>
            <div className="modal-body">
              <p>Please paste a YouTube video link to display</p>
              <input
                type="text"
                className="url-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                onClick={() => handleUrlSubmit()}
                autoFocus
              />
              <div className="modal-examples">
                <small>Supported formats:</small>
                <small>• https://www.youtube.com/watch?v=VIDEO_ID</small>
                <small>• https://youtu.be/VIDEO_ID</small>
                <small>• https://www.youtube.com/embed/VIDEO_ID</small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-cancel"
                onClick={handleModalClose}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-submit"
                onClick={handleUrlSubmit}
              >
                Load Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
