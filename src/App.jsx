import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [loaded, setLoaded] = useState(false);
  const [attendance, setAttendance] = useState([
    { serialNo: 1, name: 'kushal', status: 'Absent' },
    { serialNo: 2, name: 'radhika', status: 'Absent' },
    { serialNo: 3, name: 'manikanta', status: 'Absent' },
  ]);
  // Load models and labeled images
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      // console.log('models loaded1');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      // console.log('models loaded2');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      // console.log('models loaded3');
      setLoaded(true);
    };

    loadModels();
  }, []);

  // Start webcam and detect faces
  useEffect(() => {
    if (!loaded) return;

    const startWebcam = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;
    };

    const loadLabeledImages = async () => {
      const labels = ['kushal', 'radhika','manikanta']; // Add more labels as needed
      return Promise.all(
        labels.map(async (label) => {
          const descriptions = [];
          for (let i = 1; i <= 2; i++) { // Load 2 images per person
            // console.log(`/known_faces/${label}/${i}.jpeg`);
            const img = await faceapi.fetchImage(`/known_faces/${label}/${i}.jpeg`);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            descriptions.push(detection.descriptor);
          }
          return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
      );
    };

    const detectFaces = async () => {
      const labeledFaceDescriptors = await loadLabeledImages();
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Recognize faces and update attendance
        const recognizedNames = resizedDetections.map((fd) => {
          const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
          return bestMatch.label.toLowerCase();
        });

        // Update attendance status
        setAttendance((prevAttendance) =>
          prevAttendance.map((student) => ({
            ...student,
            status: recognizedNames.includes(student.name.toLowerCase()) ? 'Present' : 'Absent',
          }))
        );


        const labeledDetections = resizedDetections.map((fd) => {
          const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
          return { detection: fd, label: bestMatch.toString() };
        });
        faceapi.draw.drawDetections(canvas, labeledDetections.map((fd) => fd.detection));
        labeledDetections.forEach(({ detection, label }) => {
          const { x, y, width, height } = detection.detection.box;
          ctx.fillStyle = 'green';
          ctx.font = '16px Arial';
          ctx.fillText(label, x, y - 10);
          console.log(label);
          ctx.strokeStyle = 'green';
          ctx.strokeRect(x, y, width, height);
        });
      }, 100);
    };

    startWebcam().then(detectFaces);
  }, [loaded]);
  console.log(attendance)
  return (
    <div className="App">
      <div className="video-container">
        <video ref={videoRef} width="640" height="480" autoPlay muted />
        <canvas ref={canvasRef} width="640" height="480" />
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Serial No</th>
              <th>Student Name</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((student) => (
              <tr key={student.serialNo}>
                <td>{student.serialNo}</td>
                <td>{student.name}</td>
                <td>{student.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;