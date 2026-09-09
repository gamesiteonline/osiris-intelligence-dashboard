# External Reference Notes

## IndustryTap
Source: https://www.industrytap.com/creating-virtual-touch-screens-control-mobile-desktop-devices/

The article describes Carnegie Mellon’s WorldKit concept for projecting touch-based interfaces onto everyday surfaces. It explains that sensors can infer touch position using passive time-difference-of-arrival techniques and compares the interaction model with Kinect and PlayStation Move tracking. For OSIRIS, the relevant product inspiration is a responsive touch surface: drag or touch to manipulate the world view, then tap a point to open a contextual interface. This does not imply implementing acoustic sensing or covert tracking; the web app uses ordinary pointer/touch events on a globe and only public geospatial data.

## Map integration guidance
Source: local skill guidance at /home/ubuntu/skills/webdev-maps-integration/SKILL.md

The project template provides a Google Maps frontend integration through client/src/components/Map.tsx with automatic proxy authentication. The guidance recommends the frontend SDK for maps, geocoding, places, geometry, and map layers, and says not to request user-provided API keys. The current OSIRIS globe instead uses a real NASA Earth texture with browser canvas spherical projection so it can support a rotatable globe surface rather than a flat map.
