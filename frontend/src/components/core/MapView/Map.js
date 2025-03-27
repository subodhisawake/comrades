// src/components/core/MapView/Map.js
import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

const MapComponent = ({ location, radius, onRadiusChange, onLocationChange }) => {
  const map = useMap();
  const circleRef = useRef(null);

  useEffect(() => {
    if (!map || !location) return;

    // Use google.maps.Circle directly
    circleRef.current = new window.google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      center: location,
      radius: radius,
      map: map,
      editable: true,
      draggable: true
    });

    // Event listeners
    circleRef.current.addListener('radius_changed', () => {
      onRadiusChange(circleRef.current.getRadius());
    });

    circleRef.current.addListener('center_changed', () => {
      const center = circleRef.current.getCenter();
      onLocationChange({ lat: center.lat(), lng: center.lng() });
    });

    return () => {
      if (circleRef.current) {
        window.google.maps.event.clearInstanceListeners(circleRef.current);
        circleRef.current.setMap(null);
      }
    };
  }, [map, location, radius, onRadiusChange, onLocationChange]);

  return null;
};

export default MapComponent;
