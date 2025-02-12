import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const BASE_URL = "https://minxsmusic-images.vercel.app";

function App() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch uploaded files from server
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/files`);
      setUploadedFiles(data);
      // console.log("object", data)
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFiles = event.target.files;
    const validFiles = [];
    let fileError = "";

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileType = file.type.split("/")[0];

      if (fileType === "image") {
        validFiles.push(file);
      } else {
        fileError = "Please select only image files.";
      }
    }

    setFiles(validFiles);
    setError(fileError);
  };

  // Upload file
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("No file selected!");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      setTimeout(async () => {
        const { data } = await axios.post(`${BASE_URL}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        });

        setUploading(false);
        setFiles([]);
        setUploadProgress(0);
        document.getElementById("fileInput").value = "";
        // console.log(data.files)

        setUploadedFiles((prevFiles) => [...prevFiles, ...data.files]);
      }, 2000);
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      setError("Error uploading file!");
      console.error("Error uploading file:", error);
    }
  };

  // Delete file
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/files/${id}`);
      fetchFiles(); // Refresh file list
    } catch (error) {
      console.error("Error deleting file:", error);
      setMessage("Failed to delete file.");
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex justify-content-center align-items-center bg-dark text-white">
      <div className="w-100 p-4 m-5 border rounded bg-gradient">
        <h2 className="text-center text-uppercase mb-4">Image Upload System</h2>

        {/* File Upload */}
        <div className="mb-3">
          <input
            type="file"
            id="fileInput"
            multiple
            accept="image/*"
            className="form-control mb-2 bg-secondary text-white"
            onChange={handleFileChange}
          />

          {/* Progress Bar */}
          {uploading && (
            <div className="progress mt-2">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                role="progressbar"
                style={{ width: `${uploadProgress}%` }}
                aria-valuenow={uploadProgress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {uploadProgress}%
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {message && !error && (
            <div className="alert alert-info mt-3">{message}</div>
          )}

          <button
            className="btn btn-primary w-100 mt-2"
            onClick={handleUpload}
            disabled={uploading || !files}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length === 0 ? (
          <>
            <h4 className="mt-5 text-center mb-3 text-uppercase">
              Uploaded Images
            </h4>
            <p className="text-center">No images uploaded yet.</p>
          </>
        ) : (
          <>
            <h4 className="mt-5 text-center mb-3 text-uppercase">
              Uploaded Images ({uploadedFiles.length})
            </h4>
            <div className="table-responsive">
              <table className="table table-dark table-bordered table-hover text-white">
                <thead className="thead-light">
                  <tr>
                    <th scope="col" className="text-center">
                      #
                    </th>
                    <th scope="col">File Name</th>
                    <th scope="col" className="text-center">
                      View
                    </th>
                    <th scope="col" className="text-center">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedFiles
                    .slice() // Create a shallow copy to avoid modifying state
                    .sort((a, b) =>
                      a.filename
                        .replace(/-/g, " ")
                        .localeCompare(b.filename.replace(/-/g, " "))
                    )
                    .map((file, index) => (
                      <tr key={file._id}>
                        <th scope="row" className="text-center">
                          {index + 1}
                        </th>
                        <td>
                          {file.filename.replace(/-/g, " ")}
                        </td>
                        <td className="text-center">
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-success btn-sm"
                          >
                            View
                          </a>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(file._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
