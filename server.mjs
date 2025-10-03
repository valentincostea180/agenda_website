// server.mjs
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from public directory

// Ensure public/data directory exists
const dataDir = path.join(__dirname, "public", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Paths to JSON files — always relative to server.mjs location
const meetingsPath = path.join(dataDir, "meeting-rooms.json");
const visitorsPath = path.join(dataDir, "visitors.json");
const participantsPath = path.join(dataDir, "participants.json"); // New participants file

// Initialize files if they don't exist
if (!fs.existsSync(meetingsPath)) {
  const initialMeetingRooms = [
    {
      id: "1",
      name: "Chipicao Session Room",
      meetings: [],
    },
    {
      id: "2",
      name: "7Days Session Room",
      meetings: [],
    },
    {
      id: "3",
      name: "Middle Session Room",
      meetings: [],
    },
  ];
  fs.writeFileSync(meetingsPath, JSON.stringify(initialMeetingRooms, null, 2));
}
if (!fs.existsSync(visitorsPath))
  fs.writeFileSync(visitorsPath, JSON.stringify([], null, 2));
if (!fs.existsSync(participantsPath))
  fs.writeFileSync(participantsPath, JSON.stringify({}, null, 2)); // Initialize as empty object

// Helper functions
const readJSON = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
    throw err;
  }
};

// ===== GET Endpoints =====
app.get("/api/meeting-rooms", (req, res) => {
  try {
    let meetingRooms = readJSON(meetingsPath);

    // Transform old structure to new structure if needed
    meetingRooms = meetingRooms.map((room) => {
      if (room.meetingTitle !== undefined) {
        return {
          id: room.id,
          name: room.name,
          meetings: room.meetingTitle
            ? [
                {
                  id: `m-${room.id}-legacy`,
                  title: room.meetingTitle,
                  startTime: room.startTime,
                  endTime: room.endTime,
                },
              ]
            : [],
        };
      }
      return room;
    });

    res.json(meetingRooms);
  } catch (err) {
    res.status(500).json({ error: "Failed to read meeting rooms" });
  }
});

app.get("/api/visitors", (req, res) => {
  try {
    const visitors = readJSON(visitorsPath);
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: "Failed to read visitors" });
  }
});

// ===== PARTICIPANTS ENDPOINTS =====
app.get("/api/meetings/:meetingId/participants", (req, res) => {
  try {
    const { meetingId } = req.params;
    const participantsData = readJSON(participantsPath);

    // Return participants for this meeting or empty array if none exist
    const participants = participantsData[meetingId] || [];
    res.json(participants);
  } catch (err) {
    console.error("Error reading participants:", err);
    res.status(500).json({ error: "Failed to read participants" });
  }
});

app.post("/api/meetings/:meetingId/participants", (req, res) => {
  try {
    const { meetingId } = req.params;
    const { participants } = req.body;

    console.log(`Saving participants for meeting ${meetingId}:`, participants);

    const participantsData = readJSON(participantsPath);

    // Update participants for this meeting
    participantsData[meetingId] = participants;

    writeJSON(participantsPath, participantsData);
    res.json({ success: true, participants: participantsData[meetingId] });
  } catch (err) {
    console.error("Error saving participants:", err);
    res.status(500).json({ error: "Failed to save participants" });
  }
});

app.delete(
  "/api/meetings/:meetingId/participants/:participantId",
  (req, res) => {
    try {
      const { meetingId, participantId } = req.params;

      const participantsData = readJSON(participantsPath);

      if (participantsData[meetingId]) {
        participantsData[meetingId] = participantsData[meetingId].filter(
          (p) => p.id !== participantId
        );
        writeJSON(participantsPath, participantsData);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting participant:", err);
      res.status(500).json({ error: "Failed to delete participant" });
    }
  }
);

// Clean up participants when a meeting is deleted
app.delete("/api/meetings/:meetingId/participants", (req, res) => {
  try {
    const { meetingId } = req.params;

    const participantsData = readJSON(participantsPath);

    if (participantsData[meetingId]) {
      delete participantsData[meetingId];
      writeJSON(participantsPath, participantsData);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error cleaning up participants:", err);
    res.status(500).json({ error: "Failed to clean up participants" });
  }
});

// ===== POST Endpoints =====
app.post("/api/meeting-rooms", (req, res) => {
  try {
    console.log("Received POST request:", req.body);
    const meetingRooms = readJSON(meetingsPath);
    const { roomId, title, startTime, endTime } = req.body;

    const roomIndex = meetingRooms.findIndex((room) => room.id === roomId);
    if (roomIndex === -1)
      return res.status(404).json({ error: "Room not found" });

    // Generate a unique ID for the new meeting
    const newMeetingId = `m-${Date.now()}`;
    const newMeeting = {
      id: newMeetingId,
      title,
      startTime,
      endTime,
    };

    // Initialize meetings array if it doesn't exist
    if (!meetingRooms[roomIndex].meetings) {
      meetingRooms[roomIndex].meetings = [];
    }

    // Add the new meeting to the room's meetings array
    meetingRooms[roomIndex].meetings.push(newMeeting);

    writeJSON(meetingsPath, meetingRooms);
    res.json(meetingRooms[roomIndex]);
  } catch (err) {
    console.error("Error adding meeting:", err);
    res.status(500).json({ error: "Failed to add meeting" });
  }
});

app.post("/api/visitors", (req, res) => {
  try {
    const visitors = readJSON(visitorsPath);
    const newVisitor = { id: Date.now().toString(), ...req.body };
    visitors.push(newVisitor);
    writeJSON(visitorsPath, visitors);
    res.json(newVisitor);
  } catch (err) {
    console.error("Error adding visitor:", err);
    res.status(500).json({ error: "Failed to add visitor" });
  }
});

// ===== DELETE Endpoints =====
app.delete("/api/meeting-rooms/:meetingId", (req, res) => {
  try {
    const meetingRooms = readJSON(meetingsPath);
    const { meetingId } = req.params;

    let meetingRemoved = false;

    // Find and remove the meeting from any room
    for (const room of meetingRooms) {
      if (room.meetings && room.meetings.length > 0) {
        const initialLength = room.meetings.length;
        room.meetings = room.meetings.filter(
          (meeting) => meeting.id !== meetingId
        );

        if (room.meetings.length < initialLength) {
          meetingRemoved = true;

          // Also clean up participants for this meeting
          try {
            const participantsData = readJSON(participantsPath);
            if (participantsData[meetingId]) {
              delete participantsData[meetingId];
              writeJSON(participantsPath, participantsData);
            }
          } catch (participantErr) {
            console.error("Error cleaning up participants:", participantErr);
            // Continue with meeting deletion even if participant cleanup fails
          }

          break; // Stop after finding and removing the meeting
        }
      }
    }

    if (!meetingRemoved) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    writeJSON(meetingsPath, meetingRooms);
    res.json({ message: "Meeting removed successfully" });
  } catch (err) {
    console.error("Error removing meeting:", err);
    res.status(500).json({ error: "Failed to remove meeting" });
  }
});

app.delete("/api/visitors/:id", (req, res) => {
  try {
    let visitors = readJSON(visitorsPath);
    visitors = visitors.filter((v) => v.id !== req.params.id);
    writeJSON(visitorsPath, visitors);
    res.json({ message: "Visitor deleted" });
  } catch (err) {
    console.error("Error deleting visitor:", err);
    res.status(500).json({ error: "Failed to delete visitor" });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
