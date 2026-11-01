// React application shell rendering the complete 15-day travel guide with clean section URLs via useGuideRouting.
import { LightboxProvider } from "./components/Lightbox";
import { Topbar } from "./guide/Topbar";
import { Hero } from "./guide/Hero";
import { Filmstrip } from "./guide/Filmstrip";
import { RouteSection } from "./guide/RouteSection";
import { Days } from "./guide/Days";
import { Places } from "./guide/Places";
import { Food } from "./guide/Food";
import { Plan } from "./guide/Plan";
import { Footer } from "./guide/Footer";
import { usePlaceSelection } from "./guide/usePlaceSelection";
import { useGuideRouting } from "./routing/useGuideRouting";
import { UpdateToast } from "./pwa/UpdateToast";

export default function App() {
  const { place, lens, select } = usePlaceSelection();
  const { onLinkClick, openPlace, choosePlace, skipToMain } = useGuideRouting(place, select);

  return (
    <LightboxProvider>
      <a className="skip" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <Topbar onNavigate={onLinkClick} />
      <Hero onNavigate={onLinkClick} />
      <Filmstrip />
      <main id="main" tabIndex={-1}>
        <RouteSection onSelectPlace={openPlace} />
        <Days onOpenGuide={openPlace} />
        <Places place={place} lens={lens} onSelect={choosePlace} />
        <Food />
        <Plan />
      </main>
      <Footer />
      <UpdateToast />
    </LightboxProvider>
  );
}
