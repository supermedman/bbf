# == Materials ==

## == Rarity Values ==

- 10: 2000c @ (????) * 5 = 10000c
    - Forgotten = 2500c
    - 12 (Unique) = 3000c This needs to be increased!?
    - 12 = 15k?

- 13: 4k
- 14: 5k
- 15: 6.5k
- 16: 7k
- 17: 8k
- 18: 10k
- 19: 12k
- 20: 25k

## == Material Prefab ==

- basic fab
{
    "Name",
    "Value",
    "Rarity",
    "Rar_id",
    "UniqueMatch"?,
    "Mat_id"
}

- @ r10
{
    "Name": "ForgottenMat",
    "Value": 3000,
    "Rarity": "Forgotten",
    "Rar_id": 10,
    "Mat_id": 11
}

- @ r13
{
    "Name": "SoulMat",
    "Value": 4000,
    "Rarity": "Soul Bound",
    "Rar_id": 13,
    "Mat_id": 12
}

- @ r14
{
    "Name": "ShadowMat",
    "Value": 5000,
    "Rarity": "Shadow Bound",
    "Rar_id": 14,
    "Mat_id": 13
}

- @ r15
{
    "Name": "ChaosMat",
    "Value": 6500,
    "Rarity": "Chaos Bound",
    "Rar_id": 15,
    "Mat_id": 14
}

- @ r16
{
    "Name": "LawMat",
    "Value": 7000,
    "Rarity": "Law Bound",
    "Rar_id": 16,
    "Mat_id": 15
}

- @ r17
{
    "Name": "HatefulMat",
    "Value": 8000,
    "Rarity": "Hateful",
    "Rar_id": 17,
    "Mat_id": 16
}

- @ r18
{
    "Name": "MystMat",
    "Value": 10000,
    "Rarity": "Shifted",
    "Rar_id": 18,
    "Mat_id": 17
}

- @ r19
{
    "Name": "SecretMat",
    "Value": 12000,
    "Rarity": "$hrouded",
    "Rar_id": 19,
    "Mat_id": 18
}

- @ r20
{
    "Name": "DreamerMat",
    "Value": 25000,
    "Rarity": "DREAM-WOKEN",
    "Rar_id": 20,
    "Mat_id": 19
}

- full list
{
    "Name": "SoulMat",
    "Value": 4000,
    "Rarity": "Soul Bound",
    "Rar_id": 13,
    "Mat_id": 12
},
{
    "Name": "ShadowMat",
    "Value": 5000,
    "Rarity": "Shadow Bound",
    "Rar_id": 14,
    "Mat_id": 13
},
{
    "Name": "ChaosMat",
    "Value": 6500,
    "Rarity": "Chaos Bound",
    "Rar_id": 15,
    "Mat_id": 14
},
{
    "Name": "LawMat",
    "Value": 7000,
    "Rarity": "Law Bound",
    "Rar_id": 16,
    "Mat_id": 15
},
{
    "Name": "HatefulMat",
    "Value": 8000,
    "Rarity": "Hateful",
    "Rar_id": 17,
    "Mat_id": 16
},
{
    "Name": "MystMat",
    "Value": 10000,
    "Rarity": "Shifted",
    "Rar_id": 18,
    "Mat_id": 17
},
{
    "Name": "SecretMat",
    "Value": 12000,
    "Rarity": "$hrouded",
    "Rar_id": 19,
    "Mat_id": 18
},
{
    "Name": "DreamerMat",
    "Value": 25000,
    "Rarity": "DREAM-WOKEN",
    "Rar_id": 20,
    "Mat_id": 19
}

## == Need Rars 10, 13-20 ==

+ ~~0-9~~ Complete 
+ ~~11-12~~ Reserved

- ["r10", "Forgotten"], id 11
    - fleshy: Draconic Bone
    - gemy: Iridescent Crystal
    - herby: Phaseroot Salve
    - magical: Pure Essence-Cell
    - metalic: Draconic Phasemetal
    - rocky: Cut Mountainstone
    - silky: Draconic Phase-Cloth
    - skinny: Draconic Phase-Leather
    - slimy: Sour Slime
    - tooly: ***rad mat***
    - woody: Phaseflower Corewood

- ["r13", "Soul Bound"], id 12
    - fleshy: Willo-the-wisp
    - gemy: PhaseGlass Soul
    - herby: Rooted Soul
    - magical: Soul-Cell
    - metalic: Soul Tempered Phasemetal
    - rocky: Soulstone
    - silky: Soulwoven Cloth
    - skinny: Soul Cured Phase-Leather
    - slimy: Soul Slime
    - tooly: ***rad mat***
    - woody: Soulwood

- ["r14", "Shadow Bound"], id 13
    - fleshy: Corrupted Wisp
    - gemy: Lightless PhaseGlass
    - herby: Rooted Lightsbane
    - magical: Shadow-Cell
    - metalic: Shadow Tempered Phasemetal
    - rocky: Blackstone
    - silky: Shadowwoven Cloth
    - skinny: Shadow Cured Phase-Leather
    - slimy: Shadow Slime
    - tooly: ***rad mat***
    - woody: Shadowwood

- ["r15", "Chaos Bound"], id 14
    - fleshy: Chaos Wisp
    - gemy: Unbound PhaseGlass
    - herby: Rooted Chaosleaf
    - magical: Chaos-Cell
    - metalic: Chaos Tempered Phasemetal
    - rocky: Chaosstone
    - silky: Chaoswoven Silk
    - skinny: Chaos Cured Phase-Leather
    - slimy: Chaos Slime
    - tooly: ***rad mat***
    - woody: Chaoswood

- ["r16", "Law Bound"], id 15
    - fleshy: Focused Wisp
    - gemy: Fractal PhaseGlass
    - herby: Rooted Scaleleaf
    - magical: Stablized-Cell
    - metalic: Fractal Phasemetal
    - rocky: Fractalstone
    - silky: Fractalwoven Silk
    - skinny: Fractal Phase-Leather
    - slimy: Fractal Slime
    - tooly: ***rad mat***
    - woody: Scalewood

- ["r17", "Hateful"], id 16
    - fleshy: Blood Wisp
    - gemy: BloodStone
    - herby: Rooted Bloodleaf
    - magical: Fury-Cell
    - metalic: Blood Tempered Phasemetal
    - rocky: Bloodbrick
    - silky: Blooddripped Thread
    - skinny: Blood Cured Phase-Leather
    - slimy: Bloody Slime
    - tooly: ***rad mat***
    - woody: Furywood

- ["r18", "Shifted"], id 17
    - fleshy: Ambiguous Matter
    - gemy: Pearlescent Amber
    - herby: Yutlid Blossom
    - magical: Morphing-Cell
    - metalic: Raw Purple Resin
    - rocky: Shimmering Purplestone
    - silky: Woven Purple Sinew
    - skinny: Shimmering Phase-Leather
    - slimy: Pearlescent Slime
    - tooly: ***rad mat***
    - woody: Shimmering Purplewood

- ["r19", "$hrouded"], id 18
    - fleshy: Factory Core
    - gemy: Tempered PhaseGlass
    - herby: Phaseslag Blossom
    - magical: Yessilese-Cell
    - metalic: Purple Resin Ingot
    - rocky: Weepingstone
    - silky: Yessilese Silk
    - skinny: Reinforced Yessilese Leather
    - slimy: Factory Waste
    - tooly: ***rad mat***
    - woody: Living Cokewood

- ["r20", "DREAM-WOKEN"], id 19
    - fleshy: meat
    - gemy: glass
    - herby: leaves
    - magical: love
    - metalic: ore
    - rocky: bricks
    - silky: polyester
    - skinny: skin (It Smells Like Lotion)
    - slimy: sludge
    - tooly: uranium
    - woody: 2x4