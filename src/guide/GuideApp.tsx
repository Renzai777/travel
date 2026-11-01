import { LightboxProvider } from "../components/Lightbox";
import { Topbar } from "./Topbar";
import { Hero } from "./Hero";
import { Filmstrip } from "./Filmstrip";
import { RouteSection } from "./RouteSection";
import { Days } from "./Days";
import { Places } from "./Places";
import { Food } from "./Food";
import { Plan } from "./Plan";
import { Footer } from "./Footer";
import { usePlaceSelection } from "./usePlaceSelection";
import { useGuideRouting } from "../routing/useGuideRouting";

export function GuideApp() {
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
    </LightboxProvider>
  );
}
