// React shell. Topbar/Hero/Filmstrip are React (E1-S2); js/app.js still renders the sections below until E1-S4.
import { Topbar } from "./guide/Topbar";
import { Hero } from "./guide/Hero";
import { Filmstrip } from "./guide/Filmstrip";

export default function App() {
  return (
    <>
      <Topbar />
      <Hero />
      <Filmstrip />
    </>
  );
}
