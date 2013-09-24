ContextElement
============

ContextElement is a jQuery plugin which allows you to add an element as context item to any HTML element of your choice. It was originally designed to extend <a href="http://getbootstrap.com">Twitter Bootstrap</a> but it also runs as standalone.
The events can be triggered by left-, right- or middle mouse click or by touch for touch supported devices.

Usage
------------
To easily add a context element to your item, add `data-toggle="contextElement"` to the element of your choice. Then add the `data-target` attribute with the ID or the class of the element that will be shown as context element.
```html
<a href="#" data-toggle="contextElement" data-target="#contextMenuExample">Rightclick me!</a>
```

More details
------------
For a detailed description with demos, visit [ContextElement's GitHub page](http://merec.github.io/context-element).

Changelog
------------
#### 09-24-2013 1.0
* Fixed context element positioning when `source` is set.
* The option `source` can now be a function that returns HTML or Text.

#### 09-22-2013 Beta
Initial release.
