const Video = (props) => {
  return (
    <div className="video-container">
      <iframe
        src={props.videoUrl}
        title="YouTube video"
        className="responsive-video"
      ></iframe>
    </div>
  );
};

export default Video;
