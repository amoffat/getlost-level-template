---
name: new-property
description: Used to add a new property type to an object instance or object template in the editor. Use when the user asks for a new property type that they think is missing from an object in the editor.
---

# Editor property adder

## Instructions

### Step 1: Add property data type to interface

Open `.internal/src/types/properties.ts` and find the appropriate `Props` object to add the new property to.

### Step 2: Find the appropriate properties component

Different object types have different components that are used to render their properties. They should all be held in the `.internal/src/components/objectProperties/` directory. For example, the properties for tile groups is `.internal/src/components/objectProperties/TileGroupProperties.tsx`.

### Step 3: Find a similar property input component to copy

The goal of this step is to find a similar input component to copy, to avoid guessing at a new visualization for the property. Most of the property types have a standard way of rendering. For example, booleans are usually Switch via the `SwitchInput` input component `.internal/src/components/objectProperties/inputs/SwitchInput.tsx`.

Many properties use raw Mantine components, but some of the more common components have a thin wrapper to handle generalized behavior. These wrapped components live in `.internal/src/components/objectProperties/inputs`. But do not create a wrapped component; either use an existing one, or use a raw Mantine component.

### Step 4: Implement the component

Using the similar property found in Step 3, add the properties component found in step 2, add the new property component.

### Step 5: Ensure i18n

Any new labels, descriptions, tooltips, etc that are added for properties should use `react-i18next`'s `t()` function from `useTranslation`. The translations should be added to `.internal/public/locales/en/shell.jsonl`.
