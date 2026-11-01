// React shell. Topbar/Hero/Filmstrip are React (E1-S2); RouteSection is portalled into #route-root until E1-S4; js/app.js still renders the sections below until E1-S4.
import { createPortal } from "react-dom";
import { Topbar } from "./guide/Topbar";
import { Hero } from "./guide/Hero";
import { Filmstrip } from "./guide/Filmstrip";
import { RouteSection } from "./guide/RouteSection";

const routeRoot = document.getElementById("route-root");

export default function App() {
  return (
    <>
      <Topbar />
      <Hero />
      <Filmstrip />
      {routeRoot && createPortal(<RouteSection />, routeRoot)}
    </>
  );
}
