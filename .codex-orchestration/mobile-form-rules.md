# Mobile form rules

## Purpose
- Reuse one coherent mobile-first form contract across `vente-mobile`.
- Prioritize grouped hierarchy, stable tap targets, and consistent field semantics over Ionic defaults.

## Rules
- Use one surface family for all inputs, selectors, toggles, and upload triggers inside the same flow.
- Neutral surfaces are the default. Warm/accent color is reserved for selected states, helpers/errors, and the main CTA.
- Main date/location triggers may use the same tinted neutral-gray surface as the selected state of clickable options so emphasis stays coherent across the flow.
- Related controls must live inside a shared visual cluster so they read as one grouped decision.
- Clickable triggers and typed inputs are two distinct families:
  - clickable triggers keep the bordered card treatment and can use the tinted selected gray
  - typed inputs stay lighter/flatter so they do not read as buttons
- Labels use one hierarchy:
  - section/group label
  - field label
  - helper copy only when it clarifies state or guides the current step
- Required fields are marked with `*`.
- Optional fields must not append `(optional)` to the label.
- Step guidance belongs to the active step container, never to a generic hero subtitle.
- Step guidance for multi-step flows should live in the hero area between the current step title and the progress indicator.
- Native file inputs must be visually replaced by a mobile-friendly trigger surface with preview and explicit replace/remove states.
- Utility icons are allowed on primary picker/date fields, not as default decoration on every input.
- Do not use `ion-item` as the visual card wrapper when an option needs custom multi-line copy or a custom selection layout.
- Setting toggles should be inline rows with label/copy on the left and the toggle on the right, without their own bordered card shell.
- Dependent numeric limits should sit under the toggle as inline label/value rows, not nested cards.
- Disabled states must remain visible and clearly intentional, not disappear into the background.
- Helper/error surfaces should use one shared treatment instead of per-field ad hoc text colors or spacing.
- Review summaries should approximate the target detail-view hierarchy instead of falling back to plain label/value paragraphs.

## Current reference
- `vente-mobile/src/app/pages/add-event/*` is the first implementation of this contract.
- Reuse its cluster/surface/media-picker patterns before inventing new form styles in later mobile screens.
