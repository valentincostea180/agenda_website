
## 🎯 Key Components

### AgendaSystem
- Visitor registration form
- Time-based status automation
- Two-day filtered view
- Click-to-remove functionality

### RoomSchedule  
- Visual timeline interface
- Conflict prevention
- Participant management
- PDF report generation

### Video Component
- YouTube URL processing
- Responsive iframe embedding
- Modal-based URL input

## 💡 Smart Features

- **Time Validation**: Prevents scheduling conflicts and invalid time ranges
- **Auto-formatting**: Converts YouTube URLs to embedded format
- **Responsive Design**: Works on tablets, desktops, and touch screens
- **Error Handling**: User-friendly alerts for invalid inputs
- **Data Persistence**: Integrated with backend API

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start backend server: `node server.js`
4. Start frontend: `npm start`
5. Access at: `http://localhost:3000`

## 🔧 API Endpoints

- `GET/POST /api/visitors` - Visitor management
- `GET/POST/DELETE /api/meeting-rooms` - Meeting operations  
- `POST /api/meetings/:id/participants` - Participant handling

## 📸 Use Cases

- **Reception Areas**: Track incoming visitors
- **Office Management**: Schedule meeting rooms efficiently
- **Internal Communications**: Display company video updates
- **Administrative Tools**: Generate meeting reports and participant lists

Perfect for companies needing an integrated solution for visitor management, room scheduling, and internal communications in a single, user-friendly interface.
