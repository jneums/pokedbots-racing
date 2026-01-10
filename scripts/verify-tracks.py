#!/usr/bin/env python3
"""
Verify track integrity:
1. totalDistance matches segment lengths × laps
2. Multi-lap tracks have angles summing to 0 (closed circuit)
"""

tracks = [
    {
        "id": 1,
        "name": "Scrap Mountain Circuit",
        "totalDistance": 10600,
        "laps": 2,
        "segments": [
            500,
            400,
            300,
            350,
            250,
            400,
            300,
            200,
            350,
            450,
            500,
            400,
            350,
            300,
            250,
        ],
        "angles": [5, 12, 18, -8, 0, 15, -5, 0, 8, 22, -12, -18, -15, -7, -15],
    },
    {
        "id": 2,
        "name": "Highway of the Dead",
        "totalDistance": 6700,
        "laps": 1,
        "segments": [800, 700, 600, 500, 400, 500, 600, 700, 500, 450, 550, 400],
        "angles": [0, 0, -3, -5, 3, 5, 0, 0, 0, 0, 0, 0],
    },
    {
        "id": 3,
        "name": "Wasteland Gauntlet",
        "totalDistance": 12600,
        "laps": 1,
        "segments": [
            1000,
            800,
            700,
            900,
            600,
            800,
            700,
            650,
            750,
            900,
            800,
            700,
            600,
            500,
            900,
            700,
            600,
        ],
        "angles": [0, 3, 8, 12, -5, 0, 0, -4, -8, 0, 5, 8, -10, -5, 0, 0, -4],
    },
    {
        "id": 4,
        "name": "Junkyard Sprint",
        "totalDistance": 4470,
        "laps": 3,
        "segments": [200, 150, 180, 160, 140, 170, 150, 180, 160],
        "angles": [0, 5, 8, 12, -6, -10, -5, 0, -4],
    },
    {
        "id": 5,
        "name": "Metal Mesa Loop",
        "totalDistance": 7600,
        "laps": 2,
        "segments": [400, 350, 300, 250, 300, 250, 300, 350, 400, 350, 300, 250],
        "angles": [0, 0, 3, 8, 12, 15, -8, -10, -5, 0, 0, -15],
    },
    {
        "id": 6,
        "name": "Dune Runner",
        "totalDistance": 16500,
        "laps": 1,
        "segments": [
            1200,
            1100,
            1000,
            1300,
            1200,
            1100,
            1000,
            900,
            1200,
            1100,
            1000,
            900,
            1300,
            1200,
            1000,
        ],
        "angles": [5, 8, 12, 15, 10, 0, -8, -12, 0, 6, 10, 8, 0, -15, -39],
    },
    {
        "id": 7,
        "name": "Rust Belt Rally",
        "totalDistance": 9200,
        "laps": 1,
        "segments": [900, 850, 800, 750, 700, 650, 600, 550, 900, 850, 800, 850],
        "angles": [0, -2, 0, 0, -4, 0, 0, 0, 0, 3, 0, 3],
    },
    {
        "id": 8,
        "name": "Debris Field Dash",
        "totalDistance": 7100,
        "laps": 2,
        "segments": [300, 350, 280, 320, 400, 350, 300, 280, 320, 350, 300],
        "angles": [8, 12, 18, -10, 0, 15, 20, -15, -8, 0, -40],
    },
    {
        "id": 9,
        "name": "Velocity Viaduct",
        "totalDistance": 4500,
        "laps": 3,
        "segments": [300, 250, 280, 220, 200, 250],
        "angles": [0, 0, -5, -8, 5, 8],
    },
    {
        "id": 10,
        "name": "Sandstorm Circuit",
        "totalDistance": 10800,
        "laps": 2,
        "segments": [600, 550, 500, 450, 500, 550, 600, 550, 500, 600],
        "angles": [0, 5, 10, 12, 8, 0, -6, -10, -8, -11],
    },
    {
        "id": 11,
        "name": "Desert Sprint",
        "totalDistance": 6300,
        "laps": 3,
        "segments": [350, 300, 250, 280, 320, 300, 300],
        "angles": [0, 4, 8, -6, 0, -5, -1],
    },
    {
        "id": 12,
        "name": "Wasteland Odyssey",
        "totalDistance": 22600,
        "laps": 1,
        "segments": [
            1400,
            1200,
            1300,
            1100,
            1000,
            1200,
            1000,
            1500,
            1400,
            1200,
            1300,
            1600,
            900,
            800,
            1000,
            900,
            1100,
            1200,
            1500,
        ],
        "angles": [
            3,
            8,
            12,
            5,
            0,
            -8,
            -4,
            0,
            0,
            -5,
            0,
            0,
            8,
            15,
            22,
            18,
            -12,
            -18,
            -10,
        ],
    },
    {
        "id": 13,
        "name": "Iron Crucible",
        "totalDistance": 28800,
        "laps": 2,
        "segments": [
            1200,
            1100,
            1000,
            1200,
            800,
            900,
            700,
            1000,
            800,
            900,
            600,
            700,
            800,
            900,
            1000,
            800,
        ],
        "angles": [0, -4, 0, 0, 5, 12, 18, 15, 8, 0, 0, 8, 12, -10, -27, -37],
    },
    {
        "id": 14,
        "name": "Endless Expanse",
        "totalDistance": 50500,
        "laps": 1,
        "segments": [
            1800,
            1600,
            1700,
            1500,
            1400,
            2000,
            2000,
            1800,
            1600,
            1700,
            1900,
            2000,
            1800,
            1700,
            2200,
            2000,
            1800,
            1900,
            2100,
            2000,
            2000,
            1900,
            1800,
            2000,
            1700,
            1600,
            2000,
            1000,
        ],
        "angles": [
            8,
            12,
            15,
            18,
            10,
            5,
            0,
            6,
            -4,
            0,
            8,
            10,
            4,
            -6,
            12,
            15,
            8,
            0,
            5,
            10,
            -8,
            -12,
            -15,
            -10,
            -6,
            0,
            -8,
            -20,
        ],
    },
    {
        "id": 15,
        "name": "Survival Gauntlet",
        "totalDistance": 59000,
        "laps": 1,
        "segments": [
            1500,
            1400,
            1600,
            1300,
            1200,
            1500,
            1400,
            1600,
            1500,
            2000,
            1900,
            1800,
            2100,
            2000,
            1900,
            2200,
            2100,
            2200,
            2000,
            1900,
            2100,
            2000,
            1800,
            2000,
            1900,
            2100,
            2000,
            1200,
            1100,
            1300,
            1200,
            1100,
            1400,
            1200,
            1500,
        ],
        "angles": [
            8,
            15,
            20,
            18,
            12,
            -10,
            -15,
            -8,
            0,
            0,
            -5,
            0,
            0,
            -3,
            0,
            0,
            0,
            8,
            12,
            15,
            10,
            5,
            0,
            -6,
            -10,
            8,
            0,
            0,
            8,
            15,
            10,
            -8,
            0,
            -12,
            -6,
        ],
    },
]


def verify_track(track):
    errors = []

    # Check 1: Total distance
    segment_sum = sum(track["segments"])
    expected_total = segment_sum * track["laps"]

    if expected_total != track["totalDistance"]:
        errors.append(
            f"  ❌ Distance mismatch: declared {track['totalDistance']}m but segments sum to {segment_sum}m × {track['laps']} laps = {expected_total}m"
        )
    else:
        print(f"  ✓ Distance correct: {track['totalDistance']}m")

    # Check 2: Angle sum for multi-lap tracks
    if track["laps"] > 1:
        angle_sum = sum(track["angles"])
        if angle_sum != 0:
            errors.append(
                f"  ❌ Angle sum is {angle_sum}° (should be 0° for {track['laps']}-lap circuit)"
            )
        else:
            print(f"  ✓ Angles sum to 0° (closed circuit)")
    else:
        print(f"  ℹ Single lap (no angle sum requirement)")

    # Check 3: Segment and angle count match
    if len(track["segments"]) != len(track["angles"]):
        errors.append(
            f"  ❌ Segment count ({len(track['segments'])}) doesn't match angle count ({len(track['angles'])})"
        )

    return errors


print("=" * 70)
print("TRACK INTEGRITY VERIFICATION")
print("=" * 70)

all_errors = []
for track in tracks:
    print(
        f"\nTrack {track['id']}: {track['name']} ({track['totalDistance']/1000:.1f}km, {track['laps']} lap{'s' if track['laps'] > 1 else ''})"
    )
    errors = verify_track(track)
    if errors:
        all_errors.extend([(track["id"], track["name"], err) for err in errors])

print("\n" + "=" * 70)
if all_errors:
    print(f"FOUND {len(all_errors)} ERRORS:\n")
    for track_id, track_name, error in all_errors:
        print(f"Track {track_id} ({track_name}):")
        print(error)
else:
    print("✅ ALL TRACKS VERIFIED - NO ERRORS FOUND!")
print("=" * 70)
