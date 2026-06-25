# 1Çatı Produkt-Roadmap — Reale Marktprobleme Juni 2026

> Status: Juni 2026  
> Zweck: Jedes aktuelle Problem des türkischen Immobilienmarktes auf eine konkrete 1Çatı-Funktion abbilden. Dabei wird unterschieden zwischen **MVP** (lieferbar in Phase 1–2), **Roadmap** (Phase 3–5) und **nicht umsetzbar / außerhalb des Scope**.

## 1. Regulatorische & vertrauensbasiende Probleme

### A. EİDS / e-Devlet-Autorisierung für Inserate (seit 15.02.2026)
- **Problem:** Jedes Verkaufsinserat auf Sahibinden/Hepsiemlak benötigt eine EİDS-Autorisierung des Eigentümers über e-Devlet. Nicht lizenzierte Makler dürfen nicht mehr inserieren. Viele alte Inserate wurden gelöscht. Eigentümer erteilen die Vollmacht, verkaufen aber hinterher direkt — Kommissionsstreitigkeiten.
- **MVP-Lösung:**
  - `EİDS Authorization`-Dokumententyp im Dokumentenarchiv mit Upload, Status („beantragt / erteilt / abgelaufen“) und Ablaufdatum.
  - Automatische Erinnerung 30/7/1 Tag vor Ablauf.
  - Verknüpfung der Autorisierung mit dem Listing-Objekt; Statusanzeige „EİDS onaylı“.
  - Kommissionsvereinbarung als Vorlage/Typ im Dokumentenarchiv.
- **Roadmap:** Direkte Anbindung an e-Devlet / Sahibinden EİDS-API, sobald regulatorisch und technisch verfügbar.
- **Nicht umsetzbar:** Automatische Erteilung von EİDS-Vollmachten ohne e-Devlet-Zugang des Eigentümers; Rechtsgültige Verhinderung von Direktverkäufen.

### B. Betrug und gefälschte Unterlagen
- **Problem:** Gefälschte TAPU-Scans, gefälschte Verträge, Scheinmakler. Ausländer sind besonders betroffen.
- **MVP-Lösung:**
  - Due-Diligence-Checkliste pro Objekt/Deal (TAPU-Scan hochladen, Vertrag, DASK, Bebauungsplan, Fotodokumentation).
  - Pflichtfelder vor Statuswechsel („Kontrolle abgeschlossen“).
  - Rollenbasierte Freigabe: Nur Manager/Direktor darf Deal in „Vertragsreif“ setzen.
- **Roadmap:** TAPU-QR/Barcode-Scan zur Überprüfung, Anbindung an elektronische Tapu-Services, Zeitstempel/Notar-Workflow.
- **Nicht umsetzbar:** 100%ige Fälschungssicherheit ohne staatliche API oder Notarintegration; rechtliche Haftung für Richtigkeit der Unterlagen.

### C. Aufenthaltsgenehmigung & Staatsbürgerschaft für ausländische Käufer
- **Problem:** Mindestwert 200.000 $ (SPK-gutachten), Einkommensnachweis ~700–900 $/Monat, Krankenversicherung, viele Stadtteile in Antalya/Alanya wegen 25%-Ausländerquote gesperrt, russische Staatsbürger zahlen höhere Gebühren 2026.
- **MVP-Lösung:**
  - Eligibilitäts-Rechner: Kaufpreis + Nationalität + Stadtteil → Vorabcheck „wahrscheinlich qualifiziert / Prüfung erforderlich“.
  - Dokumenten-Checkliste pro Antragstyp (Aufenthalt, Staatsbürgerschaft).
  - SPK-Gutachtenwert als Feld am Objekt/Deal.
- **Roadmap:** Aktualisierbare Stadtteil-Quoten-Datenbank, Integration mit Konsulats-/Ausländerbehörde-Terminbuchung.
- **Nicht umsetzbar:** Automatische Genehmigung durch türkische Behörden; garantierte Einkommens- oder Krankenversicherungsprüfung.

### D. Geld- & Steuerfragen ausländischer Investoren
- **Problem:** Sorge, Vermögen wieder aus der Türkei zu transferieren; Spekulationssteuer bei Verkauf innerhalb von 5 Jahren; Unterdeklaration beim Tapu; Währungsvolatilität.
- **MVP-Lösung:**
  - Mehrwährungsfelder (TRY/EUR/USD) pro Objekt, Zahlung und Bericht.
  - Kauf-/Verkaufspreis-Historie für Transparenz.
  - Einfacher Spekulationssteuer-Schätzer (Haltefrist, Kauf-/Verkaufswert).
- **Roadmap:** Bank-API-Integration für Zahlungsabgleich, automatische Steuerbericht-Vorlagen, Währungsabsicherungshinweise.
- **Nicht umsetzbar:** Automatischer Geldtransfer ins Ausland; Steuerberatung durch die Software; rechtliche Beratung.

## 2. Operative Probleme von Agenturen

### E. Lead-Management & Reaktionszeit
- **Problem:** Nach 30 Minuten sinkt die Conversion drastisch. Alles läuft über WhatsApp/Telegram; keine Historie, keine Übergabe.
- **MVP-Lösung:**
  - Zentrales Lead-Postfach in 1Çatı mit Quelle, Status und Zuweisung.
  - Reaktionszeit-Timer („Lead älter als 30 Minuten“ → visueller Alert).
  - Notizen & Kommunikationshistorie pro Lead.
- **Roadmap:** WhatsApp Business API / Telegram Bot, KI-Lead-Qualifizierung, automatische Antwortvorlagen.

### F. Terminplanung
- **Problem:** Ein Besichtigungstermin benötigt ~6 Nachrichten hin und her.
- **MVP-Lösung:**
  - Kalender mit Besichtigungsslots, automatische Erinnerungen, Verknüpfung mit Objekt und Agent.
- **Roadmap:** Cal.com-Integration, Selbstbuchung durch Kunden, Airbnb/Booking-Kalender-Sync.

### G. Wartung & Eigentümertransparenz
- **Problem:** Reparaturen gehen in Chats unter; vorher/nachher-Fotos fehlen; Streitigkeiten vorprogrammiert.
- **MVP-Lösung:**
  - Wartungstickets mit Foto/Video, Priorität, Historie, Status.
  - Eigentümer-Bericht mit Foto-Timeline und Kostenaufstellung.
- **Roadmap:** Echtzeit-Fotostream, Techniker-App, Lieferantenmanagement.

### H. Kurzzeitvermietung & Bußgelder
- **Problem:** Bis zu 1.000.000 ₺ Strafe bei fehlender TÜRSAB-Lizenz, KBS/e-GUEST-Meldung innerhalb 24 h.
- **MVP-Lösung:**
  - Compliance-Checkliste pro Kurzzeitvermietung (Lizenz, e-GUEST, KBS).
  - Fristen-Tracker für 24h-Meldung.
  - Dokumentenablage für TÜRSAB-Lizenz.
- **Roadmap:** Automatisierte e-GUEST/KBS-Meldung, wenn offizielle APIs verfügbar.

### I. Außendienst ohne Internet
- **Problem:** Agenten vor Ort können keine Mängel erfassen; Daten gehen verloren oder werden falsch nachgetragen.
- **MVP-Lösung:**
  - PWA-Grundgerüst mit lokaler Speicherung (IndexedDB) für neu erfasste Tickets/Notizen.
  - Synchronisierung, sobald Verbindung wieder da.
- **Roadmap:** Native Mobile-App mit Offline-Kamera, Standort-Tracking, Spracherkennung.

## 3. Zusammenfassung MVP vs. Roadmap

### MVP (lieferbar in Phase 1–2)
| Modul | Kernfunktion |
|-------|--------------|
| CRM | Leads, Kunden, Eigentümer, Rollen |
| Listings | Objektkatalog mit Status, EİDS-Autorisierungstracking |
| Dokumente | TAPU, Verträge, DASK, Kommissionsvereinbarungen, Due-Diligence-Checkliste |
| Compliance | TÜRSAB/e-GUEST-Checkliste, Fristen-Tracker, Aufenthalts-Eligibilitätsrechner |
| Kalender | Besichtigungen, Aufgaben, Termine |
| Tickets | Wartung mit Foto/Video, Offline-Erfassung (PWA) |
| Finanzen | Mehrwährungsfelder, Eigentümerberichte, Spekulationssteuer-Schätzer |
| Sicherheit | RBAC, RLS, Audit-Log für Statuswechsel |
| Sprachen | Türkisch, Russisch, Englisch, Deutsch |

### Roadmap (Phase 3–5)
- WhatsApp Business API / Telegram Integration
- In-App VoIP / Video (WebRTC)
- KI-Chatbot für Lead-Qualifizierung
- Airbnb / Booking.com Kalender-Sync
- Automatisierte KBS/e-GUEST-Meldung
- Eigentümer- & Mieter-Mobile-Portale
- Erweiterte Analytik & Forecasting
- EİDS/e-Devlet-API (sobald verfügbar)

### Nicht Teil von 1Çatı
- Rechtsberatung oder Haftung für Vertragsrichtigkeit
- Automatische staatliche Genehmigungen
- Geldtransfer-/Banking-Abwicklung
- Garantie gegen Betrug ohne externe Verifikation

## 4. Demo-Hinweise

Wenn du das System im Demo-Modus zeigst:
1. Starte mit dem **Lead-Postfach** und dem 30-Minuten-Timer.
2. Zeige ein **Objekt mit EİDS-Status und Due-Diligence-Checkliste**.
3. Öffne ein **Wartungsticket** mit Foto/Video.
4. Zeige den **Compliance-Tracker** für Kurzzeitvermietung.
5. Erwähne deutlich, was MVP ist und was ein Platzhalter/Roadmap ist.
