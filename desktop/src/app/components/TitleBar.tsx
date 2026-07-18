import { Minus, Square, X } from "lucide-react";
import "./TitleBar.css";


export default function TitleBar() {


  const minimize = () => {
    window.vsmart?.minimize();
  };


  const maximize = () => {
    window.vsmart?.maximize();
  };


  const close = () => {
    window.vsmart?.close();
  };


  return (

    <div className="titlebar">

      <div className="title">
        ✦ VSMART AI
      </div>


      <div className="window-controls">

        <button onClick={minimize}>
          <Minus size={16}/>
        </button>


        <button onClick={maximize}>
          <Square size={14}/>
        </button>


        <button onClick={close}>
          <X size={16}/>
        </button>


      </div>

    </div>

  );
}