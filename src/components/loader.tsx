import React from "react";
import "../style/loader.css";

interface LoaderProps {
  children: React.ReactNode;
}

const Loader: React.FC<LoaderProps> = (props) => {
  return (
    <div className="wrapper">
      <div className="spinner"></div>
      <p>{props.children}</p>
    </div>
  );
};

export default Loader;
