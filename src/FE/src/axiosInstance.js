import axios from "axios";
import { toast } from "react-toastify"; // Import react-toastify

const getToken = () => localStorage.getItem("token");

const setToken = (token, isAdmin) => {
  if (isAdmin) {
    localStorage.setItem("adminToken", token);
  } else {
    localStorage.setItem("token", token);
  }
};

let cancelTokenSource;

let axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BASEURL + "api",
  headers: {
    "Content-type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response.data.status === "Error") {
      const errorMessage = error.response.data.error.message;
      if (Array.isArray(errorMessage)) {
        throw new Error(errorMessage.join(", "));
      } else {
        throw new Error(errorMessage);
      }
    } else if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

class AxiosInstance {
  async login(postData) {
    try {
      const response = await axiosInstance.post("/auth/login", postData);
      if (response.data.data.token) {
        setToken(response.data.data.token, false);
      }
      return response.data;
    } catch (error) {
      return { error };
    }
  }

  async refreshToken(isAdmin) {
    try {
      let response;
      response = await axiosInstance.get("/auth/refresh");
      if (response.data.data.accessToken) {
        setToken(response.data.data.accessToken, false);
      }
      if (isAdmin) {
        const adminToken = localStorage.getItem("adminToken");
        response = await axiosInstance.get("/auth/refresh", {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        if (response.data.data.accessToken) {
          setToken(response.data.data.accessToken, true);
        }
      }
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async contactUs(postData) {
    try {
      const response = await axiosInstance.post("/contactus", postData);
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async getData(url) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async postData(url, postData, headers = {}) {
    try {
      const response = await axiosInstance.post(url, postData, headers);
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async updateData(url, postData) {
    try {
      const response = await axiosInstance.put(url, postData);
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async deleteData(url, postData) {
    try {
      const response = await axiosInstance.delete(url, postData);
      return response.data;
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async generateUnhealthyImagesPdf(projectId) {
    try {
      const response = await axiosInstance.get(
        `/pdf/unhealthy-images/${projectId}`,
        {
          responseType: "blob",
        },
      );
      // Extract filename from Content-Disposition header if available
      let filename = "Inspection Report.pdf";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename="?([^";]+)"?/);
        if (matches && matches.length > 1) {
          filename = matches[1];
        }
      }

      return { blob: response.data, filename };
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async generateUnhealthyImagesPdfForImageIds(projectId, imageIds) {
    try {
      const response = await axiosInstance.post(
        `/pdf/unhealthy-images/${projectId}`,
        { imageIds },
        { responseType: "blob" },
      );
      let filename = "Inspection Report.pdf";
      const disposition = response.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename="?([^";]+)"?/);
        if (matches && matches.length > 1) {
          filename = matches[1];
        }
      }
      return { blob: response.data, filename };
    } catch (error) {
      toast.error(`${error.message}`);
      return { error };
    }
  }

  async sharePdfReport(projectId) {
    try {
      const response = await axiosInstance.post(`/pdf/share/${projectId}`);
      return { shareUrl: response.data.shareUrl };
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  async sharePdfReportWithBlob(pdfBlob, projectName) {
    try {
      const formData = new FormData();
      formData.append("pdf", pdfBlob, `${projectName}-report.pdf`);

      const response = await axiosInstance.post("/pdf/share-blob", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return { shareUrl: response.data.shareUrl };
    } catch (error) {
      toast.error(`${error.message}`); // Show toast on error
      return { error };
    }
  }

  logout() {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("Request canceled due to logout.");
    }
    localStorage.removeItem("token");
  }
}

const initializeAxios = new AxiosInstance();

export default initializeAxios;
