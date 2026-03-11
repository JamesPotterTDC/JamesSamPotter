"""
Privacy utilities for route redaction.

Implements defense-in-depth route protection by removing start and end 
segments from polylines to prevent precise location exposure.
"""
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


def decode_polyline(encoded: str) -> List[Tuple[float, float]]:
    """
    Decode a Google polyline string into list of (lat, lng) coordinates.
    
    Args:
        encoded: Polyline encoded string
        
    Returns:
        List of (lat, lng) tuples
    """
    if not encoded:
        return []
    
    coordinates = []
    index = 0
    lat = 0
    lng = 0

    while index < len(encoded):
        shift = 0
        result = 0

        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20:
                break

        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        shift = 0
        result = 0

        while True:
            byte = ord(encoded[index]) - 63
            index += 1
            result |= (byte & 0x1f) << shift
            shift += 5
            if byte < 0x20:
                break

        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append((lat / 1e5, lng / 1e5))

    return coordinates


def encode_polyline(coordinates: List[Tuple[float, float]]) -> str:
    """
    Encode list of (lat, lng) coordinates into polyline string.
    
    Args:
        coordinates: List of (lat, lng) tuples
        
    Returns:
        Polyline encoded string
    """
    if not coordinates:
        return ''
    
    def encode_value(value: int) -> str:
        value = ~(value << 1) if value < 0 else (value << 1)
        encoded = ''
        while value >= 0x20:
            encoded += chr((0x20 | (value & 0x1f)) + 63)
            value >>= 5
        encoded += chr(value + 63)
        return encoded

    encoded = ''
    prev_lat = 0
    prev_lng = 0

    for lat, lng in coordinates:
        lat_int = int(round(lat * 1e5))
        lng_int = int(round(lng * 1e5))
        
        encoded += encode_value(lat_int - prev_lat)
        encoded += encode_value(lng_int - prev_lng)
        
        prev_lat = lat_int
        prev_lng = lng_int

    return encoded


def redact_polyline(polyline: str, redact_percent: int = 10, min_points: int = 20) -> str:
    """
    Redact start and end portions of a polyline for privacy.
    
    This removes the first N% and last N% of route points to prevent
    exposing precise start/end locations (home, work, etc).
    
    Args:
        polyline: Encoded polyline string
        redact_percent: Percentage to remove from each end (default 10%)
        min_points: Minimum points required (return empty if fewer)
        
    Returns:
        Redacted polyline string, or empty string if too short
    """
    if not polyline:
        return ''
    
    try:
        coordinates = decode_polyline(polyline)
        
        if len(coordinates) < min_points:
            logger.debug(f"Polyline too short ({len(coordinates)} points), returning empty")
            return ''
        
        points_to_remove = max(1, int(len(coordinates) * redact_percent / 100))
        
        redacted_coords = coordinates[points_to_remove:-points_to_remove]
        
        if len(redacted_coords) < 2:
            logger.debug("Redaction would leave too few points, returning empty")
            return ''
        
        redacted = encode_polyline(redacted_coords)
        
        logger.debug(f"Redacted polyline: {len(coordinates)} -> {len(redacted_coords)} points")
        
        return redacted
    
    except Exception as e:
        logger.error(f"Polyline redaction failed: {e}")
        return ''


def should_fetch_streams() -> bool:
    """
    Check if stream fetching is enabled.
    
    Streams include latlng data which can expose precise locations.
    Default to disabled for privacy.
    """
    from django.conf import settings
    return getattr(settings, 'STRAVA_FETCH_STREAMS', False)


def get_redact_percent() -> int:
    """Get configured redaction percentage from settings."""
    from django.conf import settings
    return getattr(settings, 'MAP_REDACT_PERCENT', 10)
