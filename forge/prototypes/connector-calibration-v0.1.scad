// Rookie Quest Forge - Connector Calibration v0.1
// Prototype fit gauge. NOT a final production connector.
// Prints four male/female coupon pairs with different side clearances.
// Test fit after cooling; record the best pair before locking the frame standard.

$fn = 36;

inch = 25.4;
coupon_x = 28;
coupon_y = 16;
base_h = 3.0;
connector_w = 9.0;
connector_depth = 2.4;
connector_h = 1.4;
lead_in = 0.45;
row_gap = 8;
pair_gap = 7;
clearances = [0.15, 0.20, 0.25, 0.30];

// Low-profile trapezoidal "speed bump" tongue at the base edge.
module male_tongue(width=connector_w, depth=connector_depth, height=connector_h) {
    // Cross section: narrower at the top for easy seating/removal.
    hull() {
        translate([0, -depth, 0]) cube([width, depth, 0.25]);
        translate([lead_in, -depth + 0.35, height-0.25]) cube([width-2*lead_in, depth-0.70, 0.25]);
    }
}

module male_coupon(index=0) {
    translate([0,0,0]) {
        cube([coupon_x, coupon_y, base_h]);
        // Connector at the centre of the joining edge, integrated at the base.
        translate([(coupon_x-connector_w)/2, 0, 0]) male_tongue();
        // tactile ID bumps: 1..4 identify the clearance row without tiny text
        for (i=[0:index])
            translate([5+i*3.1, coupon_y-4.5, base_h-0.6]) cylinder(h=0.8, r=0.75);
    }
}

module female_cut(clearance=0.20) {
    // Oversize the receiving channel equally around the tongue profile.
    w = connector_w + 2*clearance;
    d = connector_depth + clearance;
    h = connector_h + clearance;
    hull() {
        translate([0, -0.01, -0.01]) cube([w, d+0.02, 0.25+clearance]);
        translate([lead_in-clearance, 0.35, h-0.25]) cube([w-2*(lead_in-clearance), max(0.6,d-0.70), 0.25+clearance]);
    }
}

module female_coupon(clearance=0.20, index=0) {
    difference() {
        cube([coupon_x, coupon_y, base_h]);
        // Channel opens through the mating edge and sits at the base.
        translate([(coupon_x-(connector_w+2*clearance))/2, -0.01, -0.01]) female_cut(clearance);
        for (i=[0:index])
            translate([5+i*3.1, coupon_y-4.5, base_h-0.6]) cylinder(h=0.8, r=0.75);
    }
}

// Layout: each row is one clearance pair.
for (r=[0:len(clearances)-1]) {
    y = r*(coupon_y + row_gap);
    // male on left, female on right; joining edges face each other
    translate([0, y, 0]) rotate([0,0,180]) translate([-coupon_x,-coupon_y,0]) male_coupon(r);
    translate([coupon_x + pair_gap, y, 0]) female_coupon(clearances[r], r);
}
