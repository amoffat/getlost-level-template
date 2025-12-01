# Object Properties

The object properties subsystem is a generic framework for adding properties to in-editor objects and classes (referred to as "templates"), and allowing editing of those properties.

## Purpose

There are several object types that can exist in a map: tile groups, lights, and gateways (entrances and exits) are a few of these. Each of these object types are unique in that they have their own properties. For example, light objects have an intensity property and a color property. Tile group objects have a color tint property.

Changing these properties at scale requires a powerful framework. It is desirable to select an individual object and change individual properties that only affect that single object. It's also desirable to change individual properties that affect all objects of that type. It should also handle changing properties on multiple objects. Object properties can be switched between "unique" and "shared", indicating where that property's value lives: on the object (in the former), or on the template (in the latter).

## Terminology

- Object - a thing placed in the map which can have proeprties
- Template - the class of an object whose purpose is to hold shared properties
- Type - used to describe both an object and a template, together
- Property - an attribute that lives on both an object and a template and can be changed by the user

## How it works

### The PropertyValue component

This is the workhorse of the property system. It handles rendering, changing, and resetting an arbitrary input field that is tied to a map selection. This arbitrary input field can be anything, like a TextInput, or Switch, or even a ColorInput. This is passed in via the `renderInput` prop, which takes a function and renders the input component.

### Validation

Some properties require validation. Validator functions should be stored in `./validators/` and should return either an error string or null (for no error). They receive either a value or undefined, if multiple conflicting property values exist.

Common validation includes requiring a name property, or requiring that a name property is unique. The unique name validator is interesting because it coordinates across multiple objects (and not just selected objects), which requires looking at all objects for that type. Check the `ExitProperties` component's name property for how to do this.

## Adding a new property

Adding a new property to an object type involves several steps, from deciding where the state lives, to how the input component should communicate that state. For some

Adding a new property first involves deciding which component to use for the underlying input (TextInput, Switch, etc). Once this is decided

Values that get passed to `renderInput` can either be of type T (the underlying property type), or undefined. This is important; undefined is passed in when multiple objects with conflicting values are selected. If PropertyValue doesn't know how to determine a single value, it sends undefined.
