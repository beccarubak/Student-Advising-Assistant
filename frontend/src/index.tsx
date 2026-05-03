import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.fontFamily = "'Inter', sans-serif";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
