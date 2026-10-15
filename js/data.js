/* Fishing Tycoon — game data.
 * Every species is procedurally generated from hand-written base creatures
 * crossed with variant traits, using a seeded RNG so the world is identical
 * on every load (save files reference species by stable string ids). */
(function (G) {
  'use strict';

  // ---------- seeded helpers ----------
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function niceRound(x) {
    if (x < 10) return Math.round(x);
    const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
    return Math.round(x / p) * p;
  }

  // ---------- rarities ----------
  const RARITIES = [
    { name: 'Common',    color: '#9aa7b4', mult: 1,    w: 620 },
    { name: 'Uncommon',  color: '#43b047', mult: 2.2,  w: 250 },
    { name: 'Rare',      color: '#2f8cf0', mult: 5,    w: 95 },
    { name: 'Epic',      color: '#a43be0', mult: 13,   w: 28 },
    { name: 'Legendary', color: '#ff9a1f', mult: 40,   w: 6 },
    { name: 'Mythic',    color: '#ff3b5c', mult: 140,  w: 1.2 },
    { name: 'Fabled',    color: '#ffd23f', mult: 2500, w: 0 }
  ];
  const FABLED = 6;

  const CATS = {
    fish: 'Fish', eel: 'Eel', shark: 'Shark', whale: 'Whale', dolphin: 'Dolphin', octopus: 'Octopus',
    squid: 'Squid', crab: 'Crab', lobster: 'Lobster', starfish: 'Starfish', seahorse: 'Seahorse',
    sponge: 'Sea Sponge', snail: 'Sea Snail', urchin: 'Sea Urchin', sealion: 'Sea Lion',
    seaspider: 'Sea Spider', plankton: 'Plankton', coral: 'Coral', manatee: 'Manatee',
    barnacle: 'Barnacle', junk: 'Junk', fabled: 'Fabled', frenzy: 'Frenzy Fish'
  };

  // ---------- locations ----------
  // fish:   'Name|avgKg|depthFrac|baseRarity'
  // others: 'Name|arch|avgKg|depthFrac|baseRarity'
  const LOCATIONS = [
    { id: 'pond', name: 'Muddy Pond', theme: 'pond', boat: false,
      desc: 'A murky little pond behind Grandpa\'s barn. The catfish rule here.',
      fish: ['Minnow|0.02|0|0', 'Bluegill|0.3|0|0', 'Pumpkinseed|0.25|0.05|0', 'Yellow Perch|0.4|0.15|0', 'Black Crappie|0.5|0.2|0', 'Brown Bullhead|0.9|0.3|0', 'Rock Bass|0.6|0.25|0', 'Common Carp|4|0.45|1', 'Largemouth Bass|2.2|0.4|1', 'Smallmouth Bass|1.6|0.5|1', 'Channel Catfish|5|0.65|1', 'Blue Catfish|12|0.85|2'],
      others: ['Pond Snail|snail|0.01|0|0', 'Freshwater Sponge|sponge|0.2|0.3|0', 'Crayfish|lobster|0.05|0.2|0', 'American Eel|eel|1.5|0.6|1'] },
    { id: 'river', name: 'Babbling River', theme: 'river', boat: false,
      desc: 'Fast, cold water full of trout, pike and the occasional salmon.',
      fish: ['Creek Chub|0.1|0|0', 'Longnose Dace|0.05|0|0', 'Brook Trout|0.8|0.1|0', 'Rainbow Trout|1.2|0.15|0', 'White Sucker|1|0.25|0', 'Brown Trout|2|0.3|1', 'Sauger|1.2|0.4|0', 'Walleye|2.5|0.45|1', 'Northern Pike|4|0.55|1', 'Chinook Salmon|10|0.6|2', 'Muskellunge|12|0.75|2', 'Lake Sturgeon|40|0.9|3'],
      others: ['River Snail|snail|0.01|0|0', 'Signal Crayfish|lobster|0.08|0.2|0', 'River Crab|crab|0.2|0.3|0', 'River Sponge|sponge|0.2|0.5|0', 'Sea Lamprey|eel|1|0.4|1'] },
    { id: 'bayou', name: 'Swampy Bayou', theme: 'swamp', boat: false,
      desc: 'Spooky cypress swamp. Gars with teeth longer than your fingers.',
      fish: ['Mosquitofish|0.01|0|0', 'Flier|0.2|0.05|0', 'Warmouth|0.3|0.1|0', 'Pirate Perch|0.1|0.1|0', 'Spotted Gar|2|0.3|0', 'Bowfin|3|0.35|1', 'Longnose Gar|5|0.45|1', 'Bigmouth Buffalo|8|0.5|1', 'Flathead Catfish|15|0.65|1', 'Paddlefish|25|0.75|2', 'Alligator Gar|60|0.9|3'],
      others: ['Apple Snail|snail|0.1|0|0', 'Red Swamp Crawfish|lobster|0.06|0.1|0', 'Asian Swamp Eel|eel|0.5|0.3|0', 'Blue Crab|crab|0.4|0.4|1', 'Swamp Sponge|sponge|0.3|0.5|0'] },
    { id: 'mountain', name: 'Misty Mountain Lake', theme: 'mountain', boat: false,
      desc: 'An icy alpine lake. Deep, clear and full of chars and trout.',
      fish: ['Sculpin|0.05|0|0', 'Cisco|0.4|0.1|0', 'Kokanee Salmon|0.8|0.2|0', 'Cutthroat Trout|1.5|0.25|0', 'Arctic Grayling|0.8|0.2|1', 'Lake Whitefish|1.8|0.35|0', 'Bull Trout|4|0.5|1', 'Golden Trout|1|0.45|2', 'Burbot|3|0.65|1', 'Lake Trout|9|0.75|1', 'Arctic Char|5|0.6|2', 'Giant Mackinaw|25|0.92|3'],
      others: ['Glacier Snail|snail|0.02|0|0', 'Alpine Crayfish|lobster|0.07|0.2|0', 'Baikal Sponge|sponge|0.3|0.6|1', 'Mountain Crab|crab|0.2|0.3|0'] },
    { id: 'amazon', name: 'Amazon River', theme: 'jungle', boat: true,
      desc: 'Steamy jungle river. Piranhas, pink dolphins and the mighty arapaima.',
      fish: ['Neon Tetra|0.005|0|0', 'Cardinal Tetra|0.005|0|0', 'Oscar|1|0.15|0', 'Discus|0.3|0.1|1', 'Red-Bellied Piranha|0.6|0.2|0', 'Black Piranha|1.5|0.35|1', 'Peacock Bass|4|0.35|1', 'Pacu|8|0.4|1', 'Silver Arowana|5|0.5|2', 'Payara|6|0.55|2', 'Redtail Catfish|30|0.7|2', 'Arapaima|100|0.9|3'],
      others: ['Amazon Apple Snail|snail|0.15|0|0', 'Amazon Crab|crab|0.3|0.2|0', 'Electric Eel|eel|10|0.5|2', 'Pink River Dolphin|dolphin|150|0.7|3', 'Amazonian Manatee|manatee|400|0.8|3'] },
    { id: 'beach', name: 'Sandy Beach Pier', theme: 'beach', boat: false,
      desc: 'Your first taste of salt water! Crabs, drums and flounders.',
      fish: ['Pinfish|0.2|0|0', 'Spot|0.3|0.05|0', 'Atlantic Croaker|0.5|0.1|0', 'Whiting|0.4|0.15|0', 'Florida Pompano|1.5|0.25|1', 'Sheepshead|2|0.3|0', 'Summer Flounder|2.5|0.4|1', 'Bluefish|4|0.45|1', 'Spanish Mackerel|2.5|0.4|1', 'Red Drum|8|0.6|1', 'Black Drum|12|0.7|1', 'Cobia|25|0.85|2'],
      others: ['Ghost Crab|crab|0.08|0|0', 'Hermit Crab|crab|0.05|0|0', 'Sand Dollar|starfish|0.03|0.1|0', 'Common Starfish|starfish|0.2|0.2|0', 'Moon Snail|snail|0.2|0.2|0', 'Acorn Barnacle|barnacle|0.01|0|0', 'Loggerhead Sponge|sponge|2|0.5|1'] },
    { id: 'mangrove', name: 'Mangrove Lagoon', theme: 'mangrove', boat: true,
      desc: 'Tangled roots hide snook, tarpon, seahorses and sleepy manatees.',
      fish: ['Mudskipper|0.02|0|0', 'Archerfish|0.3|0|0', 'Needlefish|0.5|0.1|0', 'Ladyfish|1.5|0.2|0', 'Mangrove Snapper|1.5|0.3|0', 'Lookdown|0.8|0.25|1', 'Bonefish|3|0.4|1', 'Permit|9|0.55|1', 'Common Snook|8|0.5|1', 'Atlantic Tarpon|50|0.75|2', 'Goliath Grouper|180|0.92|3'],
      others: ['Fiddler Crab|crab|0.02|0|0', 'Mangrove Tree Crab|crab|0.05|0.1|0', 'Mangrove Periwinkle|snail|0.01|0|0', 'Mangrove Barnacle|barnacle|0.01|0|0', 'Fire Sponge|sponge|1|0.5|1', 'Lined Seahorse|seahorse|0.02|0.3|1', 'Florida Manatee|manatee|500|0.8|3'] },
    { id: 'reef', name: 'Coral Reef', theme: 'reef', boat: true,
      desc: 'A rainbow city of coral. Clownfish, tangs, octopi and reef sharks.',
      fish: ['Damselfish|0.05|0|0', 'Clownfish|0.1|0|0', 'Butterflyfish|0.2|0.1|0', 'Royal Gramma|0.05|0.1|1', 'Yellow Tang|0.3|0.15|0', 'Blue Tang|0.4|0.2|0', 'Moorish Idol|0.4|0.25|1', 'Queen Angelfish|1|0.3|1', 'Pufferfish|1|0.3|0', 'Stoplight Parrotfish|1.5|0.35|0', 'Lionfish|1|0.4|1', 'Mandarin Dragonet|0.03|0.35|2', 'Napoleon Wrasse|90|0.85|3'],
      others: ['Staghorn Coral|coral|3|0.2|0', 'Brain Coral|coral|5|0.3|0', 'Sea Fan Coral|coral|2|0.4|1', 'Blue Linckia Starfish|starfish|0.3|0.2|0', 'Crown-of-Thorns Starfish|starfish|1|0.4|1', 'Long-Spined Sea Urchin|urchin|0.3|0.2|0', 'Coral Crab|crab|0.3|0.2|0', 'Cone Snail|snail|0.1|0.3|1', 'Barrel Sponge|sponge|8|0.6|1', 'Day Octopus|octopus|2|0.4|1', 'Pygmy Seahorse|seahorse|0.01|0.5|2', 'Caribbean Spiny Lobster|lobster|2|0.5|1', 'Green Moray Eel|eel|15|0.6|2', 'Blacktip Reef Shark|shark|20|0.7|2'] },
    { id: 'kelp', name: 'Kelp Forest', theme: 'kelp', boat: true,
      desc: 'Towering golden kelp. Sea lions zoom between the stalks.',
      fish: ['Señorita|0.1|0|0', 'Opaleye|1|0.1|0', 'Halfmoon|0.8|0.15|0', 'Garibaldi|0.5|0.2|1', 'Kelp Bass|2|0.25|0', 'Kelp Greenling|1.5|0.3|0', 'California Sheephead|5|0.4|1', 'Vermilion Rockfish|4|0.5|1', 'Cabezon|5|0.55|1', 'Lingcod|15|0.7|2', 'Giant Sea Bass|150|0.9|3'],
      others: ['Kelp Snail|snail|0.02|0|0', 'Purple Sea Urchin|urchin|0.1|0|0', 'Red Sea Urchin|urchin|0.3|0.2|0', 'Bat Star|starfish|0.2|0.1|0', 'Kelp Crab|crab|0.2|0.1|0', 'Sunflower Sea Star|starfish|3|0.4|1', 'Two-Spot Octopus|octopus|0.4|0.4|1', 'California Spiny Lobster|lobster|2.5|0.5|1', 'Horn Shark|shark|8|0.6|1', 'California Sea Lion|sealion|200|0.6|2', 'Leopard Shark|shark|15|0.7|2', 'Wolf Eel|eel|15|0.75|2'] },
    { id: 'harbor', name: 'Rocky Harbor', theme: 'harbor', boat: true,
      desc: 'A foggy fishing town. Cod, lobsters and giant octopi lurk below.',
      fish: ['Atlantic Herring|0.3|0|0', 'Atlantic Mackerel|0.6|0.05|0', 'Pollock|3|0.2|0', 'Silver Hake|1|0.25|0', 'Haddock|2|0.3|0', 'Lumpfish|3|0.4|1', 'Atlantic Cod|10|0.45|1', 'Cusk|5|0.55|1', 'Atlantic Wolffish|10|0.6|2', 'Monkfish|20|0.75|2', 'Atlantic Halibut|100|0.9|3'],
      others: ['Rock Crab|crab|0.4|0|0', 'Gooseneck Barnacle|barnacle|0.02|0|0', 'Common Whelk|snail|0.1|0.1|0', 'Breadcrumb Sponge|sponge|0.3|0.3|0', 'Dungeness Crab|crab|1|0.2|0', 'American Lobster|lobster|3|0.4|1', 'Spiny Dogfish|shark|5|0.5|1', 'Conger Eel|eel|20|0.6|1', 'Giant Pacific Octopus|octopus|30|0.7|2', 'Steller Sea Lion|sealion|600|0.7|3'] },
    { id: 'arctic', name: 'Arctic Ice Sea', theme: 'arctic', boat: true,
      desc: 'Brrr! Icebergs, walruses, narwhals and things with antifreeze blood.',
      fish: ['Capelin|0.05|0|0', 'Polar Cod|0.2|0.05|0', 'Arctic Cod|0.5|0.15|0', 'Arctic Sculpin|0.3|0.2|0', 'Arctic Lumpsucker|1|0.3|1', 'Polar Eelpout|0.5|0.35|0', 'Sea Char|3|0.4|1', 'Greenland Turbot|5|0.4|1', 'Icefish|1|0.45|1', 'Antarctic Toothfish|80|0.85|3'],
      others: ['Arctic Sea Star|starfish|0.5|0.2|0', 'Snow Crab|crab|1|0.3|0', 'Glacial Squid|squid|2|0.4|1', 'Red King Crab|crab|5|0.5|1', 'Antarctic Sea Spider|seaspider|0.5|0.5|2', 'Leopard Seal|sealion|400|0.6|2', 'Walrus|sealion|1200|0.7|3', 'Beluga Whale|whale|1400|0.7|3', 'Narwhal|whale|1600|0.8|3', 'Greenland Shark|shark|700|0.9|3', 'Bowhead Whale|whale|80000|0.95|4'] },
    { id: 'tropical', name: 'Tropical Islands', theme: 'tropical', boat: true,
      desc: 'Turquoise water, coconut crabs, dolphins and blazing-fast sailfish.',
      fish: ['Sergeant Major|0.2|0|0', 'Humuhumu Triggerfish|0.5|0.05|0', 'Rainbow Runner|5|0.2|0', 'Skipjack Tuna|5|0.25|0', 'Bonito|4|0.25|0', 'Great Barracuda|15|0.4|1', 'Mahi-Mahi|15|0.45|1', 'Wahoo|30|0.5|1', 'Giant Trevally|40|0.6|2', 'Yellowfin Tuna|80|0.7|2', 'Sailfish|60|0.8|3'],
      others: ['Tiger Cowrie|snail|0.1|0.1|0', 'Slate Pencil Urchin|urchin|0.3|0.1|0', 'Mushroom Coral|coral|1|0.2|0', 'Bigfin Reef Squid|squid|1|0.3|0', 'Coconut Crab|crab|4|0|1', 'Spinner Dolphin|dolphin|70|0.5|1', 'Bottlenose Dolphin|dolphin|200|0.6|2', 'Hawaiian Monk Seal|sealion|200|0.6|2', 'Tiger Shark|shark|500|0.85|3'] },
    { id: 'ocean', name: 'Open Ocean', theme: 'ocean', boat: true,
      desc: 'Nothing but blue in every direction. Home of marlins and great whales.',
      fish: ['Flying Fish|0.3|0|0', 'Pilotfish|0.5|0.05|0', 'Albacore|20|0.3|0', 'Opah|50|0.45|1', 'Striped Marlin|90|0.5|1', 'Ocean Sunfish|1000|0.6|2', 'Swordfish|150|0.65|2', 'Atlantic Bluefin Tuna|400|0.7|2', 'Black Marlin|400|0.75|2', 'Blue Marlin|500|0.8|3', 'Giant Oarfish|200|0.92|3'],
      others: ['Common Dolphin|dolphin|100|0.1|0', 'Blue Shark|shark|150|0.3|0', 'Humboldt Squid|squid|40|0.5|1', 'Mako Shark|shark|500|0.5|1', 'Oceanic Whitetip|shark|150|0.5|1', 'Orca|dolphin|5000|0.6|2', 'Humpback Whale|whale|30000|0.7|2', 'Great White Shark|shark|1500|0.75|3', 'Whale Shark|shark|15000|0.85|3', 'Sperm Whale|whale|45000|0.9|3', 'Blue Whale|whale|150000|0.95|4'] },
    { id: 'shipwreck', name: 'Shipwreck Cove', theme: 'shipwreck', boat: true,
      desc: 'A pirate ship graveyard. Cursed treasure, ghost sharks and coelacanths.',
      fish: ['Spadefish|1|0|0', 'Hogfish|3|0.1|0', 'Scorpionfish|1|0.2|0', 'Red Snapper|5|0.25|0', 'Frogfish|0.5|0.3|1', 'Red-Lipped Batfish|0.3|0.35|2', 'Greater Amberjack|30|0.4|1', 'Ghost Pipefish|0.01|0.45|2', 'Golden Tilefish|10|0.5|1', 'Warsaw Grouper|150|0.75|2', 'Coelacanth|90|0.9|4'],
      others: ['Pirate Barnacle|barnacle|0.05|0|0', 'Wreck Sponge|sponge|2|0.2|0', 'Spotted Moray|eel|3|0.4|0', 'Coconut Octopus|octopus|0.5|0.3|1', 'Treasure Crab|crab|2|0.3|1', 'Slipper Lobster|lobster|1|0.4|1', "Triton's Trumpet|snail|1|0.5|1", 'Sand Tiger Shark|shark|150|0.6|2', 'Ghost Shark|shark|5|0.7|2'] },
    { id: 'volcano', name: 'Volcanic Vents', theme: 'volcano', boat: true,
      desc: 'Boiling vents on the sea floor. Creatures here are literally on fire.',
      fish: ['Ember Goby|0.05|0|0', 'Cinder Snapper|3|0.1|0', 'Basalt Bass|5|0.2|0', 'Lava Lizardfish|2|0.3|0', 'Obsidian Eelpout|1|0.4|1', 'Pyro Pufferfish|2|0.45|1', 'Magma Grouper|60|0.5|1', 'Sulfur Tilefish|10|0.55|1', 'Blind Vent Fish|0.5|0.6|2', 'Phoenix Koi|8|0.8|3', 'Hellfire Marlin|600|0.92|3'],
      others: ['Vent Barnacle|barnacle|0.02|0|0', 'Fire Coral|coral|2|0.1|0', 'Sulfur Sponge|sponge|3|0.2|0', 'Volcano Urchin|urchin|0.5|0.2|0', 'Yeti Crab|crab|0.1|0.3|1', 'Scaly-Foot Snail|snail|0.05|0.4|2', 'Hydrothermal Sea Spider|seaspider|0.3|0.5|1', 'Dumbo Octopus|octopus|5|0.6|2', 'Vampire Squid|squid|0.5|0.7|2'] },
    { id: 'bermuda', name: 'Bermuda Triangle', theme: 'bermuda', boat: true,
      desc: 'Compasses spin, ships vanish... and fish glitch in and out of reality.',
      fish: ['Static Sardine|0.1|0|0', 'Compass Fish|1|0.1|0', 'Fog Tuna|30|0.2|0', 'Phantom Flounder|5|0.3|1', 'Vanishing Snapper|8|0.3|1', 'Triangle Trout|3|0.35|1', 'Lost Pilotfish|1|0.4|0', 'Warp Wahoo|40|0.45|1', 'Glitch Grouper|90|0.5|1', 'Wormhole Wrasse|10|0.6|2', 'Mystery Marlin|700|0.85|3'],
      others: ['Ghost Ship Barnacle|barnacle|0.05|0|0', 'Compass Starfish|starfish|1|0.1|0', 'Static Urchin|urchin|0.5|0.2|0', 'Vortex Coral|coral|5|0.3|1', 'Riddle Squid|squid|20|0.5|1', 'Echo Eel|eel|30|0.6|1', 'Paradox Octopus|octopus|20|0.6|2', 'Spectral Shark|shark|800|0.75|2'] },
    { id: 'atlantis', name: 'Lost City of Atlantis', theme: 'atlantis', boat: true,
      desc: 'Golden temples beneath the waves. Royalty swims here.',
      fish: ['Marble Minnow|0.05|0|0', 'Golden Angelfish|1|0|0', 'Gilded Carp|8|0.15|0', 'Pillar Pike|15|0.25|0', 'Oracle Fish|5|0.35|1', 'Royal Gar|50|0.45|1', 'Crystal Koi|10|0.5|2', 'Trident Tuna|300|0.55|1', 'Philosopher Fish|20|0.6|2', 'Atlantean Arowana|30|0.75|2', 'Titan Grouper|900|0.9|3'],
      others: ['Column Barnacle|barnacle|0.1|0|0', 'Mosaic Starfish|starfish|1|0.1|0', 'Temple Coral|coral|10|0.1|0', 'Atlantean Seahorse|seahorse|3|0.2|1', 'Pearl Nautilus|snail|2|0.4|1', 'Atlantean Lobster|lobster|10|0.4|1', 'Royal Octopus|octopus|50|0.5|2', 'Marble Sea Spider|seaspider|5|0.6|2', 'Guardian Shark|shark|2000|0.8|3'] },
    { id: 'northpole', name: 'North Pole Sea', theme: 'northpole', boat: true,
      desc: 'Candy canes, snow and jingle bells. Is that a workshop on the ice?',
      fish: ['Tinsel Tetra|0.05|0|0', 'Holly Herring|0.5|0|0', 'Candy Cane Cod|5|0.15|0', 'Jingle Bell Bass|8|0.25|0', 'Snowflake Flounder|10|0.3|1', 'Cocoa Carp|20|0.35|0', 'Peppermint Puffer|3|0.4|1', 'Gingerbread Grouper|200|0.6|1', 'Frosty Halibut|300|0.7|2', 'Sugarplum Sailfish|250|0.8|2', 'Northern Lights Koi|40|0.9|3'],
      others: ['Peppermint Snail|snail|0.5|0|0', 'Snowball Urchin|urchin|1|0.1|0', 'Frosted Starfish|starfish|2|0.1|0', 'Gumdrop Coral|coral|3|0.3|0', 'Present Crab|crab|5|0.2|1', 'Ice Squid|squid|30|0.5|1', 'Jolly Walrus|sealion|1500|0.6|2', 'Christmas Narwhal|whale|1800|0.7|2'] },
    { id: 'trench', name: 'Mariana Trench', theme: 'trench', boat: true,
      desc: 'Eleven kilometres of crushing darkness. Glowing nightmares everywhere.',
      fish: ['Hatchetfish|0.05|0|0', 'Lanternfish|0.05|0|0', 'Bristlemouth|0.01|0.05|0', 'Viperfish|0.2|0.25|0', 'Fangtooth|0.3|0.3|0', 'Barreleye|0.5|0.4|1', 'Black Swallower|0.5|0.45|1', 'Dragonfish|0.5|0.5|1', 'Blobfish|2|0.6|1', 'Humpback Anglerfish|1|0.65|2', 'Tripod Fish|1|0.75|1', 'Mariana Snailfish|0.5|0.95|3'],
      others: ['Deep-Sea Snail|snail|0.1|0.3|0', 'Glass Sponge|sponge|5|0.5|1', 'Gulper Eel|eel|3|0.5|1', 'Giant Sea Spider|seaspider|1|0.6|1', 'Frilled Shark|shark|20|0.6|2', 'Ghost Octopus|octopus|1|0.7|2', 'Goblin Shark|shark|200|0.75|2', 'Giant Squid|squid|300|0.85|3', 'Colossal Squid|squid|500|0.95|4'] },
    { id: 'cosmic', name: 'Cosmic Ocean', theme: 'cosmic', boat: true,
      desc: 'An ocean floating in outer space. Nobody knows how you got here.',
      fish: ['Milky Way Minnow|0.1|0|0', 'Quasar Guppy|0.2|0|0', 'Comet Tail Fish|5|0.15|0', 'Nebula Koi|20|0.25|1', 'Supernova Snapper|50|0.35|1', 'Pulsar Puffer|10|0.45|1', 'Saturn Sunfish|2000|0.5|1', 'Meteor Marlin|900|0.6|2', 'Astro Anglerfish|20|0.7|2', 'Big Bang Barracuda|300|0.8|2', 'Black Hole Bass|100|0.85|3'],
      others: ['Lunar Snail|snail|2|0|0', 'Asteroid Urchin|urchin|20|0.1|0', 'Galaxy Starfish|starfish|5|0.1|0', 'Stardust Coral|coral|20|0.2|0', 'Martian Crab|crab|30|0.2|1', 'Star Dolphin|dolphin|300|0.3|1', 'Plasma Eel|eel|200|0.5|2', 'Orbit Squid|squid|100|0.6|1', 'Space Whale|whale|500000|0.95|4'] }
  ];
  const LOC_PRICES = [0, 250].concat(Array.from({ length: 18 }, (_, k) => niceRound(1000 * Math.pow(3.85, k))));
  const LOC_DEPTHS = [10, 14, 20, 30, 45, 65, 90, 125, 175, 250, 400, 600, 1000, 1500, 2400, 3600, 5500, 7500, 11000, 20000];
  LOCATIONS.forEach((l, i) => { l.tier = i; l.price = LOC_PRICES[i]; l.maxDepth = LOC_DEPTHS[i]; });

  function tierValue(t) { return 4 * Math.pow(3.3, t); }

  // ---------- gear ----------
  const ROD_NAMES = ['Raggity Old Stick', 'Twig & Twine', 'Splintery Branch', 'Bamboo Pole', 'Garage Sale Rod', 'Kiddie Spincaster', 'Hickory Rod', 'Fiberglass Rod', 'Lucky Lure Rod', 'Graphite Rod', 'Trusty Spinner', 'Carbon Caster', 'River Runner', 'Swamp Stalker', 'Telescopic Rod', 'Pro Angler', 'Surf Caster', 'Deep Sea Rod', 'Reef Raider', 'Titanium Rod', 'Harpoon Rod', "Captain's Rod", 'Storm Chaser', 'Iceberg Breaker', 'Coral Crusher', 'Whale Wrangler', 'Thunder Rod', 'Volcanic Rod', 'Abyss Diver', 'Kraken Tamer', "Pirate King's Rod", 'Golden Rod', 'Diamond Rod', 'Plasma Rod', 'Laser Line 3000', 'Quantum Rod', 'Trident Rod', 'Atlantean Scepter', 'Dragon Bone Rod', 'Northern Lights Rod', 'Black Hole Rod', 'Galaxy Rod', 'Rod of Poseidon', 'Infinity Rod', 'The Omega Rod'];
  const BAIT_NAMES = ['Dried Mealworm', 'Soggy Bread', 'Earthworm', 'Corn Kernel', 'Cricket', 'Nightcrawler', 'Cheese Cube', 'Hot Dog Chunk', 'Live Minnow', 'Leech', 'Shiny Spinner', 'Rubber Worm', 'Crawdad Tail', 'Stinky Dough Ball', 'Frog Lure', 'Shrimp', 'Squid Strip', 'Sardine', 'Glow Jig', 'Clam Meat', 'Mackerel Chunk', 'Rainbow Lure', 'Golden Shrimp', 'Crab Claw', 'Electric Lure', 'Chum Bucket', 'Bioluminescent Lure', 'Lava Grub', 'Ghost Pepper Bait', "Pirate's Doubloon", 'Pearl Lure', 'Magic Krill', 'Phantom Fly', 'Dragon Scale', 'Kraken Ink', 'Atlantean Crystal', 'Unicorn Sprinkles', 'Candy Cane Cluster', 'Moon Jelly', 'Stardust', 'Comet Chunk', 'Nebula Nectar', 'Ambrosia', 'Cosmic Cheese', 'The Infinity Worm'];
  const N_GEAR = 45;
  function gearPrice(i) { return i === 0 ? 0 : niceRound(20 * Math.pow(3.85, (i - 1) * (19.3 / 43))); }
  const RODS = ROD_NAMES.map((name, i) => {
    const r = mulberry32(hashStr('rod' + name));
    return {
      id: i, name,
      depth: Math.round(10 * Math.pow(2000, (i - 6) / 38) * 10) / 10,
      cap: 2 * Math.pow(500000, i / (N_GEAR - 1)),
      reel: 0.2 + 0.17 * (i / (N_GEAR - 1)),
      price: gearPrice(i),
      hue: Math.floor(r() * 360), metal: i >= 19
    };
  });
  const BAITS = BAIT_NAMES.map((name, i) => {
    const r = mulberry32(hashStr('bait' + name));
    return {
      id: i, name,
      luck: 1 + 1.0 * Math.pow(i / (N_GEAR - 1), 1.1),
      bite: 1 - 0.55 * (i / (N_GEAR - 1)),
      price: niceRound(gearPrice(i) * 0.6),
      hue: Math.floor(r() * 360)
    };
  });

  // ---------- variants ----------
  // [key, prefix, rarityBump, sizeMult, valueMult, look]
  const VARIANTS = [
    ['', '', 0, 1, 1, null],
    ['spotted', 'Spotted', 0, 1, 1, { pat: 'spots' }],
    ['striped', 'Striped', 0, 1, 1, { pat: 'stripes' }],
    ['speckled', 'Speckled', 0, 1, 1, { pat: 'speckle' }],
    ['little', 'Little', 0, 0.55, 0.7, null],
    ['dusky', 'Dusky', 0, 1, 1, { dark: true }],
    ['pale', 'Pale', 0, 1, 1, { pale: true }],
    ['banded', 'Banded', 1, 1, 1, { pat: 'bands' }],
    ['silver', 'Silver', 1, 1, 1, { col: [205, 15, 78] }],
    ['giant', 'Giant', 1, 2.3, 1.5, null],
    ['tiger', 'Tiger', 1, 1, 1, { col: [30, 90, 55], pat: 'tiger' }],
    ['marbled', 'Marbled', 1, 1, 1, { pat: 'marble' }],
    ['albino', 'Albino', 2, 1, 1, { col: [0, 20, 95], eye: '#ff5a7a' }],
    ['golden', 'Golden', 2, 1, 1, { col: [46, 95, 55], shine: true }],
    ['ghost', 'Ghost', 2, 1, 1, { col: [190, 60, 92], alpha: 0.55 }],
    ['crimson', 'Crimson', 2, 1, 1, { col: [352, 80, 48] }],
    ['rainbow', 'Rainbow', 3, 1, 1, { rainbow: true }],
    ['crystal', 'Crystal', 3, 1, 1, { col: [185, 90, 75], alpha: 0.7, shine: true }],
    ['shadow', 'Shadow', 3, 1, 1, { col: [265, 45, 20], glow: '#b06cff' }],
    ['royal', 'Royal', 4, 1.2, 1.2, { col: [275, 70, 50], crown: true }],
    ['ancient', 'Ancient', 4, 1.6, 1.3, { col: [40, 12, 45], pat: 'marble' }],
    ['celestial', 'Celestial', 5, 1, 1.5, { galaxy: true, glow: '#8fd6ff' }]
  ];
  const OTHER_VARIANTS = ['', 'spotted', 'striped', 'little', 'dusky', 'giant', 'banded', 'albino', 'golden', 'ghost', 'crimson', 'rainbow', 'crystal', 'shadow', 'royal', 'ancient', 'celestial'];
  const JUNK_VARIANTS = [['', '', 0], ['muddy', 'Muddy', 0], ['soggy', 'Soggy', 0], ['stinky', 'Stinky', 0], ['ancient', 'Ancient', 2], ['golden', 'Golden', 3], ['celestial', 'Celestial', 5]];
  const VMAP = {}; VARIANTS.forEach(v => { VMAP[v[0]] = v; });

  const MOTIONS = ['swim', 'dart', 'glide', 'wiggle', 'bob', 'zigzag', 'loop', 'drift', 'hop', 'spiral'];
  const FLAIRS = ['bubbles', 'sparkles', 'hearts', 'stars', 'notes', 'rings', 'leaves', 'snow', 'embers', 'glints', 'zaps', 'petals'];

  // ---------- art params ----------
  function kw(n, list) { for (let i = 0; i < list.length; i++) if (n.indexOf(list[i]) >= 0) return true; return false; }
  const COLOR_WORDS = [
    [['gold', 'yellow', 'tang', 'sugar', 'amber'], [48, 90, 55]], [['blue', 'neon', 'azure', 'cobalt', 'bluegill'], [210, 75, 55]],
    [['red', 'crimson', 'vermilion', 'cardinal', 'ruby', 'fire', 'ember', 'magma', 'lava', 'hellfire', 'pyro', 'phoenix', 'candy', 'santa', 'holly'], [5, 78, 52]],
    [['green', 'kelp', 'moss', 'lime', 'greenling', 'swamp', 'martian'], [120, 50, 45]], [['black', 'shadow', 'dark', 'obsidian', 'basalt', 'cinder', 'hole', 'swallower'], [230, 20, 25]],
    [['white', 'ghost', 'snow', 'frost', 'beluga', 'ice', 'glacier', 'polar', 'pale'], [200, 30, 90]], [['pink', 'coral', 'salmon', 'peppermint', 'gumdrop'], [340, 75, 70]],
    [['silver', 'herring', 'sardine', 'tarpon', 'mackerel', 'hake', 'static', 'whiting', 'cisco'], [205, 15, 75]], [['orange', 'garibaldi', 'clown', 'oscar', 'opal', 'cobia'], [25, 95, 55]],
    [['purple', 'royal', 'nebula', 'sugarplum', 'amethyst', 'gramma', 'urchin'], [275, 60, 55]], [['brown', 'mud', 'carp', 'catfish', 'bullhead', 'sucker', 'cocoa', 'gingerbread', 'sculpin', 'drum', 'cabezon', 'walrus', 'sea lion', 'seal'], [28, 45, 40]],
    [['gray', 'grey', 'shark', 'whale', 'dolphin', 'manatee', 'marble', 'stone', 'column', 'pillar'], [210, 12, 58]], [['cosmic', 'galaxy', 'star', 'comet', 'quasar', 'pulsar', 'meteor', 'astro', 'milky', 'supernova', 'orbit', 'lunar', 'space', 'saturn', 'big bang'], [250, 60, 55]]
  ];
  function hsl(c) { return [c[0], c[1], c[2]]; }
  function makeArt(name, arch, look, rnd, rarity) {
    const n = name.toLowerCase();
    let body = [Math.floor(rnd() * 360), 45 + rnd() * 40, 45 + rnd() * 20];
    for (const [words, col] of COLOR_WORDS) if (kw(n, words)) { body = [col[0] + (rnd() * 16 - 8), col[1], col[2] + (rnd() * 10 - 5)]; break; }
    const a = {
      arch,
      c1: body,
      c2: [body[0] + 20 - rnd() * 40, Math.max(10, body[1] - 30), Math.min(92, body[2] + 28)],
      c3: [(body[0] + (rnd() < 0.5 ? 28 : -28) + (rnd() < 0.3 ? 160 : 0) + 360) % 360, 75, 52],
      pc: [(body[0] + 180) % 360, 60, 35],
      pat: ['none', 'none', 'stripes', 'spots', 'bands', 'grad', 'speckle', 'none'][Math.floor(rnd() * 8)],
      h: 0.38 + rnd() * 0.22,
      tail: ['fork', 'round', 'lunate', 'fan', 'fork'][Math.floor(rnd() * 5)],
      dorsal: ['spiky', 'round', 'tall', 'small'][Math.floor(rnd() * 4)],
      eye: 0.15 + rnd() * 0.07,
      eyeCol: '#1b2030',
      f: {}, v: rnd(), v2: rnd(), v3: rnd(),
      motion: MOTIONS[Math.floor(rnd() * MOTIONS.length)],
      ms: 0.6 + rnd() * 0.9, wf: 4 + rnd() * 6,
      flair: rarity >= 1 ? FLAIRS[Math.floor(rnd() * FLAIRS.length)] : null,
      rarity
    };
    const f = a.f;
    if (arch === 'fish') {
      if (kw(n, ['eel', ' gar', 'gar', 'needle', 'barracuda', 'pike', 'muskellunge', 'wahoo', 'oarfish', 'lamprey', 'dragonfish', 'lizardfish', 'pipefish', 'ladyfish', 'sauger', 'bowfin'])) { a.h = 0.2 + rnd() * 0.06; a.tail = 'round'; f.long = true; }
      if (kw(n, ['sunfish', 'discus', 'angelfish', 'butterfly', 'pompano', 'permit', 'lookdown', 'opah', 'tang', 'spadefish', 'moorish', 'batfish', 'halfmoon', 'bluegill', 'pumpkinseed', 'crappie', 'flier', 'piranha', 'pacu', 'idol', 'spot', 'warmouth'])) a.h = 0.68 + rnd() * 0.18;
      if (kw(n, ['puffer', 'blob', 'lumpfish', 'lumpsucker', 'frogfish', 'coffin', 'swallower'])) { a.h = 0.82; f.round = true; }
      if (kw(n, ['puffer'])) f.spikes = true;
      if (kw(n, ['sword', 'marlin', 'sail', 'gar', 'needle', 'spear'])) f.bill = true;
      if (kw(n, ['paddlefish'])) f.paddle = true;
      if (kw(n, ['catfish', 'bullhead', 'burbot', 'carp', 'cod', 'sturgeon', 'buffalo', 'cusk', 'koi', 'barbel', 'drum', 'croaker'])) f.whiskers = true;
      if (kw(n, ['piranha', 'fang', 'viper', 'barracuda', 'payara', 'wolf', 'lingcod', 'dragon', 'toothfish', 'pike', 'muskellunge', 'gar', 'bluefish', 'bang', 'hellfire', 'black hole', 'dunkle'])) f.teeth = true;
      if (kw(n, ['angler', 'monkfish'])) f.lure = true;
      if (kw(n, ['flounder', 'halibut', 'turbot', 'sole'])) { f.flat = true; a.h = 0.6; a.tail = 'round'; }
      if (kw(n, ['sailfish'])) a.dorsal = 'sail';
      if (kw(n, ['lionfish', 'scorpion', 'dragonet'])) { a.dorsal = 'spiky'; f.frills = true; }
      if (kw(n, ['tuna', 'mackerel', 'marlin', 'wahoo', 'mahi', 'bonito', 'albacore', 'swordfish', 'trevally', 'amberjack', 'cobia', 'runner'])) a.tail = 'lunate';
      if (kw(n, ['koi', 'betta', 'goldfish', 'oracle', 'phoenix', 'comet', 'mandarin', 'guppy'])) { a.tail = 'fan'; f.flowy = true; }
      if (kw(n, ['barreleye', 'telescope', 'big eye', 'opah', 'hatchet', 'snailfish'])) a.eye = 0.26;
      if (kw(n, ['lantern', 'dragonfish', 'viper', 'hatchet', 'bristlemouth', 'angler', 'glow', 'neon', 'lights', 'quasar', 'pulsar', 'vent'])) f.lights = true;
      if (kw(n, ['clown'])) { a.c1 = [25, 95, 55]; a.pat = 'bands'; a.pc = [0, 0, 98]; }
      if (kw(n, ['tiger', 'zebra', 'striped', 'candy cane', 'peppermint', 'sergeant', 'moorish', 'convict'])) { a.pat = 'stripes'; }
      if (kw(n, ['candy cane', 'peppermint'])) { a.c1 = [0, 0, 96]; a.pc = [355, 85, 50]; }
      if (kw(n, ['rainbow', 'parrot', 'mahi', 'mandarin', 'wrasse', 'señorita', 'humuhumu', 'northern lights', 'nebula'])) f.multi = true;
      if (kw(n, ['coelacanth', 'dunkle', 'ancient'])) f.armor = true;
      if (kw(n, ['jingle'])) f.bell = true;
    }
    if (arch === 'whale') {
      f.kind = kw(n, ['narwhal']) ? 'narwhal' : kw(n, ['beluga']) ? 'beluga' : kw(n, ['sperm']) ? 'sperm' : kw(n, ['humpback']) ? 'humpback' : kw(n, ['space']) ? 'space' : kw(n, ['bowhead']) ? 'bowhead' : 'blue';
      if (f.kind === 'beluga') a.c1 = [200, 20, 92];
      if (f.kind === 'space') { a.c1 = [255, 60, 40]; look = Object.assign({ galaxy: true }, look || {}); }
      if (kw(n, ['christmas'])) f.hat = true;
    }
    if (arch === 'dolphin') {
      f.kind = kw(n, ['orca']) ? 'orca' : kw(n, ['pink']) ? 'pink' : 'normal';
      if (f.kind === 'pink') a.c1 = [340, 60, 75];
      if (f.kind === 'orca') a.c1 = [220, 20, 15];
      if (kw(n, ['star'])) f.stars = true;
    }
    if (arch === 'shark') {
      f.kind = kw(n, ['hammer']) ? 'hammer' : kw(n, ['whale shark']) ? 'whaleshark' : kw(n, ['goblin']) ? 'goblin' : kw(n, ['frilled']) ? 'frilled' : kw(n, ['tiger', 'leopard', 'horn']) ? 'spotted' : kw(n, ['megalodon']) ? 'meg' : 'normal';
      if (f.kind === 'whaleshark') { a.c1 = [215, 40, 40]; a.pat = 'spots'; a.pc = [0, 0, 95]; }
      if (f.kind === 'goblin') a.c1 = [350, 40, 75];
      if (kw(n, ['tiger'])) { a.pat = 'stripes'; }
      if (kw(n, ['leopard', 'horn'])) { a.pat = 'spots'; }
      if (!kw(n, ['ghost', 'spectral', 'guardian']) && f.kind !== 'goblin' && f.kind !== 'whaleshark') a.c1 = [205 + rnd() * 15, 15 + rnd() * 15, 50 + rnd() * 15];
    }
    if (arch === 'crab') { f.kind = kw(n, ['hermit']) ? 'hermit' : kw(n, ['king', 'snow', 'yeti', 'spider', 'coconut']) ? 'leggy' : 'normal'; if (kw(n, ['present'])) f.present = true; if (kw(n, ['yeti'])) f.furry = true; }
    if (arch === 'starfish') { f.arms = kw(n, ['sunflower']) ? 14 : kw(n, ['sand dollar']) ? 0 : 5 + (rnd() < 0.2 ? 1 : 0); f.thorns = kw(n, ['thorn']); }
    if (arch === 'coral') f.kind = kw(n, ['brain']) ? 'brain' : kw(n, ['fan']) ? 'fan' : kw(n, ['mushroom', 'gumdrop']) ? 'mushroom' : 'branch';
    if (arch === 'squid') { if (kw(n, ['vampire'])) a.c1 = [350, 70, 25]; if (kw(n, ['giant', 'colossal'])) a.c1 = [5, 65, 45]; }
    if (arch === 'sealion') { f.tusks = kw(n, ['walrus']); f.spots = kw(n, ['leopard', 'monk']); if (kw(n, ['jolly'])) f.hat = true; }
    if (arch === 'snail') { f.cone = kw(n, ['cone', 'whelk', 'trumpet', 'periwinkle']); f.nautilus = kw(n, ['nautilus', 'ammonite']); f.cowrie = kw(n, ['cowrie']); }
    if (arch === 'octopus') { if (kw(n, ['dumbo'])) f.dumbo = true; if (kw(n, ['ghost'])) a.c1 = [0, 0, 95]; if (kw(n, ['royal'])) f.crown = true; }
    if (arch === 'urchin') { f.long = kw(n, ['long-spined', 'pencil']); f.snow = kw(n, ['snowball']); }
    if (arch === 'eel') { f.electric = kw(n, ['electric', 'plasma']); f.moray = kw(n, ['moray', 'conger', 'wolf']); f.gulper = kw(n, ['gulper']); f.lamprey = kw(n, ['lamprey']); f.serpent = kw(n, ['serpent', 'leviathan']); }
    if (arch === 'plankton') f.kind = kw(n, ['diatom', 'coccolith', 'foram']) ? 'diatom' : kw(n, ['radiolarian']) ? 'radio' : kw(n, ['krill', 'copepod', 'arrow']) ? 'krill' : 'blob';
    if (arch === 'lobster') { f.small = kw(n, ['cray', 'crawfish']); if (f.small) a.c1 = [10, 60, 40]; else if (!kw(n, ['spiny', 'slipper'])) a.c1 = [5, 70, 45]; }
    if (arch === 'junk') f.kind = kw(n, ['sneaker']) ? 'sneaker' : kw(n, ['can']) ? 'can' : kw(n, ['duck']) ? 'duck' : kw(n, ['tire']) ? 'tire' : kw(n, ['bottle']) ? 'bottle' : kw(n, ['sock']) ? 'sock' : 'boot';
    if (arch === 'junk' && f.kind === 'duck') a.c1 = [52, 95, 58];
    if (arch === 'junk' && f.kind === 'boot') a.c1 = [28, 45, 32];
    if (arch === 'junk' && f.kind === 'tire') a.c1 = [0, 0, 18];
    if (arch === 'junk' && f.kind === 'bottle') a.c1 = [140, 50, 45];
    // variant look overrides
    if (look) {
      if (look.pat) a.pat = look.pat;
      if (look.col) { a.c1 = hsl(look.col); a.c2 = [look.col[0], Math.max(5, look.col[1] - 30), Math.min(96, look.col[2] + 25)]; }
      if (look.dark) a.c1 = [a.c1[0], a.c1[1], Math.max(12, a.c1[2] - 22)];
      if (look.pale) { a.c1 = [a.c1[0], a.c1[1] * 0.4, Math.min(88, a.c1[2] + 25)]; }
      if (look.eye) a.eyeCol = look.eye;
      if (look.alpha) a.alpha = look.alpha;
      if (look.shine) a.shine = true;
      if (look.rainbow) a.rainbow = true;
      if (look.glow) a.glow = look.glow;
      if (look.crown) a.crown = true;
      if (look.galaxy) a.galaxy = true;
      if (look.pat === 'tiger') { a.pat = 'stripes'; a.pc = [0, 0, 12]; }
    }
    if (rarity >= 3 && !a.glow) a.glow = ['#7df9ff', '#ffe066', '#ff8cf0', '#9dff8a'][Math.floor(rnd() * 4)];
    return a;
  }

  // ---------- species generation ----------
  const SPECIES = [];
  const BY_ID = {};
  const POOLS = LOCATIONS.map(() => []);   // per-location catchable (non-global) species
  const GLOBAL = { plankton: [], junk: [], fabled: [], frenzy: [] };

  function addSpecies(sp) { SPECIES.push(sp); BY_ID[sp.id] = sp; return sp; }

  LOCATIONS.forEach((loc, li) => {
    const bases = loc.fish.map(s => { const p = s.split('|'); return { name: p[0], arch: 'fish', kg: +p[1], depth: +p[2], r: +p[3] }; })
      .concat(loc.others.map(s => { const p = s.split('|'); return { name: p[0], arch: p[1], kg: +p[2], depth: +p[3], r: +p[4] }; }));
    loc.bases = bases.length;
    bases.forEach(b => {
      const vlist = b.arch === 'fish' ? VARIANTS : OTHER_VARIANTS.map(k => VMAP[k]);
      vlist.forEach(v => {
        const id = loc.id + ':' + slug(b.name) + (v[0] ? ':' + v[0] : '');
        const rnd = mulberry32(hashStr(id));
        const rarity = Math.min(5, b.r + v[2]);
        const name = (v[1] ? v[1] + ' ' : '') + b.name;
        const jitter = 0.85 + rnd() * 0.3;
        const value = tierValue(li) * (0.5 + 1.5 * b.depth) * v[4] * RARITIES[rarity].mult * jitter;
        const sp = addSpecies({
          id, name, base: b.name, arch: b.arch, cat: CATS[b.arch], loc: li, rarity,
          kg: b.kg * v[3] * (0.9 + rnd() * 0.2), depth: b.depth, value,
          art: makeArt(name, b.arch, v[5], rnd, rarity)
        });
        POOLS[li].push(sp);
      });
    });
  });

  // global plankton & junk (valued relative to the location you catch them in)
  const PLANKTON = ['Copepod', 'Diatom', 'Krill', 'Radiolarian', 'Dinoflagellate', 'Sea Sparkle', 'Arrow Worm', 'Foraminifera', 'Moon Jelly Larva', 'Coccolithophore'];
  PLANKTON.forEach(base => {
    ['', 'spotted', 'little', 'giant', 'golden', 'ghost', 'rainbow', 'crystal', 'celestial'].forEach(k => {
      const v = VMAP[k];
      const id = 'global:' + slug(base) + (k ? ':' + k : '');
      const rnd = mulberry32(hashStr(id));
      const rarity = Math.min(5, v[2]);
      const name = (v[1] ? v[1] + ' ' : '') + base;
      const sp = addSpecies({ id, name, base, arch: 'plankton', cat: CATS.plankton, loc: -1, rarity, kg: 0.001 * v[3], depth: 0, vf: 0.4 * v[4], art: makeArt(name, 'plankton', v[5], rnd, rarity) });
      sp.art.glow = sp.art.glow || (rnd() < 0.5 ? '#9ffcff' : null);
      GLOBAL.plankton.push(sp);
    });
  });
  const JUNK = [['Old Boot', 0.8], ['Soggy Sneaker', 0.5], ['Tin Can', 0.1], ['Rubber Ducky', 0.05], ['Old Tire', 8], ['Message in a Bottle', 0.4], ['Lost Sock', 0.05]];
  JUNK.forEach(([base, kg]) => {
    JUNK_VARIANTS.forEach(([k, pre, bump]) => {
      const id = 'global:' + slug(base) + (k ? ':' + k : '');
      const rnd = mulberry32(hashStr(id));
      const name = (pre ? pre + ' ' : '') + base;
      const look = k === 'golden' ? { col: [46, 95, 55], shine: true } : k === 'ancient' ? { col: [40, 12, 45] } : k === 'celestial' ? { galaxy: true, glow: '#8fd6ff' } : k === 'muddy' ? { dark: true } : null;
      const sp = addSpecies({ id, name, base, arch: 'junk', cat: CATS.junk, loc: -1, rarity: bump, kg, depth: 0, vf: 0.25 * (bump ? RARITIES[bump].mult : 1), art: makeArt(name, 'junk', look, rnd, bump) });
      GLOBAL.junk.push(sp);
    });
  });

  // fabled: fictional & extinct legends. [name, arch, kg, valueFactor, spawnWeight, blurb]
  const FABLED_BASES = [
    ['Megalodon', 'megalodon', 50000, 3, 8, 'A prehistoric shark the size of a school bus.'],
    ['Mermaid', 'mermaid', 70, 3, 8, 'Half fish, half person, all sass.'],
    ['Kraken', 'kraken', 200000, 3, 6, 'The terror of sailors. Has never lost a tug-of-war.'],
    ['Poseidon', 'poseidon', 300, 6, 3, 'God of the sea. He is NOT happy about the hook.'],
    ['Bubble Buddy', 'bubblebuddy', 0.5, 2.5, 8, 'A bubble with a face. Your new best friend.'],
    ['Plesiosaurus', 'plesiosaur', 10000, 2, 8, 'A long-necked marine reptile from the age of dinosaurs.'],
    ['Santa Claus', 'santa', 120, 5, 3, 'What is he doing down there?! Better be on the nice list.'],
    ['UFO', 'ufo', 2000, 5, 4, 'An unidentified fishing object.'],
    ['Alien', 'alien', 40, 4, 5, 'Take me to your tackle box.'],
    ['Aquaman', 'aquaman', 110, 4.5, 4, 'Talks to fish. Is very upset you are catching them.'],
    ['Loch Ness Monster', 'plesiosaur', 8000, 3, 5, 'Finally, a photo that is not blurry!'],
    ['Mosasaurus', 'mosasaur', 15000, 2.5, 6, 'A giant sea lizard with a jaw full of daggers.'],
    ['Dunkleosteus', 'dunkle', 4000, 2, 7, 'An armored fish that could bite through anything.'],
    ['Liopleurodon', 'plesiosaur', 20000, 2.5, 6, 'A short-necked pliosaur with an enormous head.'],
    ['Sea Serpent', 'serpent', 3000, 2, 7, 'Coils for days.'],
    ['Leviathan', 'serpent', 300000, 3.5, 4, 'The beast of the deep from ancient legend.'],
    ['Ammonite', 'snail', 50, 1.5, 9, 'A spiral-shelled ancestor of the octopus.'],
    ['Trilobite', 'trilobite', 2, 1.5, 9, 'Crawled the sea floor 500 million years ago.']
  ];
  const FABLED_VARIANTS = [['', '', 1, 1, 10], ['baby', 'Baby', 0.15, 0.6, 6], ['golden', 'Golden', 1, 2, 3], ['shadow', 'Shadow', 1.2, 3, 2], ['celestial', 'Celestial', 1, 6, 1]];
  FABLED_BASES.forEach(([base, arch, kg, vf, w, blurb]) => {
    FABLED_VARIANTS.forEach(([k, pre, km, vm, vw]) => {
      const id = 'fabled:' + slug(base) + (k ? ':' + k : '');
      const rnd = mulberry32(hashStr(id));
      const name = (pre ? pre + ' ' : '') + base;
      const look = k === 'golden' ? { col: [46, 95, 55], shine: true } : k === 'shadow' ? { col: [265, 45, 22], glow: '#b06cff' } : k === 'celestial' ? { galaxy: true, glow: '#8fd6ff' } : null;
      const art = makeArt(name, arch === 'snail' ? 'snail' : arch, look, rnd, FABLED);
      if (arch === 'snail') art.f.nautilus = true;
      if (base === 'Loch Ness Monster') art.c1 = [120, 40, 38];
      if (base === 'Liopleurodon') art.f.short = true;
      art.glow = art.glow || '#ffe680';
      const sp = addSpecies({ id, name, base, arch, cat: CATS.fabled, loc: -1, rarity: FABLED, kg: kg * km, depth: 0, vf: vf * vm, w: w * vw, blurb, art });
      GLOBAL.fabled.push(sp);
    });
  });

  // frenzy fish: catching one multiplies the value of everything you catch for a short time.
  // [name, money multiplier, spawn weight, seconds, rarity, look]
  const FRENZY_TIERS = [
    ['Lucky Frenzy Fish', 1.5, 1000, 45, 1, { col: [130, 80, 50] }],
    ['Golden Frenzy Fish', 5, 150, 35, 2, { col: [46, 95, 55], shine: true }],
    ['Ruby Frenzy Fish', 10, 45, 30, 3, { col: [350, 85, 50], shine: true }],
    ['Diamond Frenzy Fish', 50, 6, 25, 4, { col: [190, 90, 78], alpha: 0.85, shine: true }],
    ['Cosmic Frenzy Fish', 100, 1.5, 20, 5, { galaxy: true, glow: '#8fd6ff' }],
    ['Mega Frenzy Fish', 1000, 0.25, 20, FABLED, { rainbow: true, glow: '#ffe680' }]
  ];
  const FRENZY_CHANCE = 0.02;
  FRENZY_TIERS.forEach(([name, mult, w, secs, rarity, look], tier) => {
    const id = 'global:frenzy-' + slug(name);
    const rnd = mulberry32(hashStr(id));
    const art = makeArt(name, 'fish', look, rnd, rarity);
    art.tail = 'fan'; art.dorsal = 'spiky'; art.h = 0.5; art.f.frenzy = mult; art.flair = 'zaps'; art.motion = 'dart'; art.ms = 1.4;
    art.glow = art.glow || ['#9dff8a', '#ffe066', '#ff8ca0', '#bff6ff'][tier] || '#ffe680';
    const sp = addSpecies({ id, name, base: name, arch: 'fish', cat: CATS.frenzy, loc: -1, rarity, kg: 1.2 + tier * 0.6, depth: 0, vf: 3, frenzy: { mult, secs, tier }, w, art,
      blurb: 'FRENZY! Everything you catch for ' + secs + ' seconds is worth ' + mult + '× more money!' });
    GLOBAL.frenzy.push(sp);
  });

  // Can this catch be put on a hook as bait? Small, ordinary, non-venomous critters only.
  const BAIT_ARCHES = ['fish', 'squid', 'plankton', 'eel', 'crab', 'lobster'];
  const NO_BAIT = ['puffer', 'lion', 'scorpion', 'electric', 'plasma', 'frog', 'blob', 'stone', 'toxic', 'coffin', 'crown', 'yeti'];
  function fishBait(sp) {
    if (!sp || sp.frenzy || sp.loc < 0 && sp.arch !== 'plankton') return null;
    if (BAIT_ARCHES.indexOf(sp.arch) < 0) return null;
    if (sp.rarity >= 4) return null;
    const max = sp.arch === 'eel' ? 3 : 8;
    if (sp.kg > max) return null;
    if (kw(sp.name.toLowerCase(), NO_BAIT)) return null;
    const tier = sp.loc >= 0 ? sp.loc : 0;
    return {
      luck: 1.1 + 0.08 * sp.rarity + 0.01 * tier,
      deep: 2 + Math.min(4, Math.max(0, Math.log2(sp.kg * 10 + 1))),
      casts: 5 + sp.rarity * 2
    };
  }

  // ---------- catch rolling ----------
  function speciesValue(sp, locTier) {
    if (sp.loc >= 0) return sp.value;
    if (sp.frenzy) return tierValue(locTier) * sp.vf;
    const mult = sp.rarity === FABLED ? RARITIES[FABLED].mult : 1;
    return tierValue(locTier) * sp.vf * mult;
  }
  function fabledChance(rod, bait, loc) {
    const r = rod / (N_GEAR - 1), b = bait / (N_GEAR - 1), l = loc / (LOCATIONS.length - 1);
    return 0.0001 * (1 + 4 * r * r) * (1 + 4 * b * b) * (1 + 1 * l);
  }
  function junkChance(bait) { return 0.09 - 0.07 * (bait / (N_GEAR - 1)); }
  function rarityWeights(luck) { return RARITIES.slice(0, 6).map((r, i) => r.w * Math.pow(luck, i)); }

  function pickWeighted(arr, wfn, rand) {
    let tot = 0; for (const x of arr) tot += wfn(x);
    let r = rand() * tot;
    for (const x of arr) { r -= wfn(x); if (r <= 0) return x; }
    return arr[arr.length - 1];
  }

  // Returns {sp, kg} for a cast. depth is the actual hook depth in metres.
  function rollCatch(locIdx, rodIdx, baitIdx, depth, rand, opts) {
    rand = rand || Math.random; opts = opts || {};
    const lm = opts.luck || 1, deep = opts.deep || 2;
    const loc = LOCATIONS[locIdx], bait = BAITS[baitIdx];
    let sp;
    if (rand() < fabledChance(rodIdx, baitIdx, locIdx)) {
      sp = pickWeighted(GLOBAL.fabled, s => s.w, rand);
    } else if (rand() < FRENZY_CHANCE) {
      sp = pickWeighted(GLOBAL.frenzy, s => s.w * Math.pow(bait.luck * lm, s.frenzy.tier), rand);
    } else if (rand() < junkChance(baitIdx)) {
      sp = pickWeighted(GLOBAL.junk, s => RARITIES[s.rarity].w, rand);
    } else if (rand() < 0.05) {
      sp = pickWeighted(GLOBAL.plankton, s => RARITIES[s.rarity].w * Math.pow(bait.luck * 1.03, s.rarity * 1.15), rand);
    } else {
      const frac = depth / loc.maxDepth;
      const pool = POOLS[locIdx].filter(s => s.depth <= frac + 1e-9);
      const luck = bait.luck * lm * (1 + 0.012 * locIdx);
      const ws = rarityWeights(luck);
      let rar = pickWeighted([0, 1, 2, 3, 4, 5], i => ws[i], rand);
      let cand = [];
      for (; rar >= 0; rar--) { cand = pool.filter(s => s.rarity === rar); if (cand.length) break; }
      // deeper species are a little more likely to bite when your hook is down there
      sp = pickWeighted(cand, s => 1 + deep * s.depth, rand);
    }
    let g = 0; for (let i = 0; i < 4; i++) g += rand(); g = (g - 2) / 0.58; // ~N(0,1)
    const kg = Math.max(0.001, sp.kg * Math.exp(g * 0.28));
    return { sp, kg };
  }

  function catchValue(sp, kg, locTier) {
    return speciesValue(sp, locTier) * Math.pow(kg / sp.kg, 0.6);
  }

  G.FT = {
    RARITIES, FABLED, CATS, LOCATIONS, RODS, BAITS, SPECIES, BY_ID, POOLS, GLOBAL, MOTIONS, FLAIRS,
    hashStr, mulberry32, tierValue, speciesValue, fabledChance, junkChance, rarityWeights, rollCatch, catchValue, fishBait, FRENZY_CHANCE
  };
  if (typeof module !== 'undefined') module.exports = G.FT;
})(typeof window !== 'undefined' ? window : globalThis);
