# Video walkthrough guide (5–10 minutes)

Record on desktop with the phone view for show-floor mode (browser device toolbar at 390px, or a real phone via the QR code on the Command Center). Add your keys in Settings first so every AI feature runs live.

## Before recording

- Settings → paste the Anthropic key, press Test connection. Paste the HubSpot token, press Test connection.
- Open the HubSpot contacts list in another tab so you can show a pushed contact appear.
- Optional: Settings → Reset to sample data, so the demo starts clean.
- Practice the voice line once: "Met Sara Chen from Adyen, head of treasury, they hedge EUR manually, wants a demo in Q1."

## Storyboard

| Time | Screen | Say |
|---|---|---|
| 0:00 | Command Center | The problem in one sentence: decisions about conferences live in spreadsheets and Slack. Spin the globe: amber is a booth, teal is a walk-through, arcs are planned trips from Tel Aviv, pulses are clusters. |
| 0:40 | Explore | "Fifty-plus real events, scored." Hover a score ring. Explain the six components in plain words and why reach is logarithmic. Drag a slider; the list re-ranks. Switch preset to Budget-conscious. "There is no single right answer, so the weights are sliders the sales lead can argue with. Track record makes it learn." |
| 2:20 | Plan | The ribbon: labelled trips, dots for candidates, halos for clusters. Open the London + Berlin swing card: four events, one trip. Show the heatmap gap and a one-click plan. Show the holiday clash card. |
| 3:20 | Phone: show floor | Tap the mic, say the line. Fields fill. The "Same person?" card: Sarah Chen from Worldpay, different company, 62%. Say why it asks instead of merging. Tap Yes. The linked card shows the arc and the nudge. Save. |
| 4:40 | Phone: after save | Push to HubSpot. Switch to the HubSpot tab and show the contact and the note. |
| 5:10 | Relationships | Open Priya Raman: three meetings, never past curious, tire-kicker, and the read says to ask the budget question. Open Omar Haddad: job change, VP to CFO, re-open as a new account. Draft a follow-up; show the three tones. Mention the three James Smiths that never merge and the undo on every merge. |
| 6:40 | Discover | Type "treasury events in APAC in H1 2027". While it searches, explain why AI is the right tool here and not for scoring. Show a result, set a date, add it, and it appears in Explore as AI-discovered. |
| 7:40 | Camera | How AI tools were used to build it: the plan first, research agents for dates, tests catching the case-sensitive parser, the colour validator argument, the two-minute discovery call fixed with streaming. Be specific about one thing that went wrong. |
| 8:40 | Camera | What you would build next week: shared backend, debriefs feeding the score, HubSpot two-way sync. |

## Answers to have ready

- **Why these weights?** Buyers in the room beat everything; the ICP is PSPs, cross-border, travel wholesalers, treasurers. Reach is log-scaled on purpose. Cost is from Tel Aviv. Track record is neutral until the team logs leads.
- **Why ask instead of auto-merge at 62%?** A wrong merge pollutes two histories; a question costs one tap while the person is in front of you.
- **Why rules for the classification and AI for the words?** The class must be explainable and consistent; the narrative benefits from judgment and tone.
- **Why a proxy?** HubSpot blocks browser calls, and keys should never sit in a URL. It is sixty lines and stateless.
- **Why localStorage?** Shipping instinct: end-to-end in scope, export and import for sharing, Supabase next.
