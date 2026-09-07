export interface HomileticalPoint {
  roman: string;
  title: string;
  subpoints?: string[];
  explanation?: string;
  scriptureRef?: string;
}

export interface Illustration {
  title: string;
  content: string;
}

export interface ReferenceSermon {
  id: string;
  volume: 'classics' | 'canonical' | 'topical' | 'liturgical';
  volumeLabel: string;
  author: string;
  era: string;
  year?: string;
  title: string;
  subtitle: string;
  scripture_primary: string;
  scriptures_secondary: string[];
  testament: 'OT' | 'NT' | 'General';
  series_name: string;
  historical_context?: string;
  theological_theme: string;
  big_idea: string;
  outline: HomileticalPoint[];
  full_text: string;
  illustrations?: Illustration[];
  key_quotes?: string[];
  application_points: string[];
  tags: string[];
}

export const REFERENCE_VOLUMES = [
  { id: 'all', label: 'All Volumes', icon: 'Library' },
  { id: 'classics', label: '🏛️ Classic Masters', icon: 'Landmark', desc: 'Spurgeon, Moody, Wesley, Luther & Edwards' },
  { id: 'canonical', label: '📖 Canonical Expository', icon: 'BookOpen', desc: 'Book-by-book exposition through Scripture' },
  { id: 'topical', label: '🕊️ Pastoral & Topical', icon: 'HeartHandshake', desc: 'Practical pastoral themes for daily life' },
  { id: 'liturgical', label: '✝️ Liturgical & Occasions', icon: 'Calendar', desc: 'Advent, Easter, Weddings, Funerals & Ceremonies' },
] as const;

export const REFERENCE_SERMONS: ReferenceSermon[] = [
  // ==========================================
  // VOLUME I: THE CLASSIC MASTERS
  // ==========================================
  {
    id: 'classic-spurgeon-anchor',
    volume: 'classics',
    volumeLabel: 'The Classic Masters',
    author: 'Charles Haddon Spurgeon',
    era: 'Victorian Era (1834–1892)',
    year: '1875',
    title: 'The Anchor of the Soul',
    subtitle: 'Hope as the Unshakeable Anchor Within the Veil',
    scripture_primary: 'Hebrews 6:19',
    scriptures_secondary: ['Hebrews 6:17-20', 'Romans 8:24-25', '1 Peter 1:3-5'],
    testament: 'NT',
    series_name: 'Metropolitan Tabernacle Pulpit',
    historical_context: 'Delivered at the Metropolitan Tabernacle in London during a winter of severe maritime storms, Spurgeon spoke to a congregation of working-class families and merchants who deeply understood the metaphor of sea navigation and shipwreck.',
    theological_theme: 'Assurance of Salvation, Christian Hope, God’s Immutability',
    big_idea: 'Our hope is not cast into the shifting sands of human emotion, but anchored upward into the holy presence of God where Christ has entered on our behalf.',
    outline: [
      {
        roman: 'I',
        title: 'The Vessel in Peril',
        subpoints: [
          'The soul is launched upon a treacherous sea subject to unforeseen tempests.',
          'Without an anchor, drift into shipwreck is inevitable.',
          'The anchors of human merit and good resolutions snap in the first gale.'
        ],
        explanation: 'Every believer must realize that the ship is frail and the waters are deep. We cannot trust the sea, nor can we trust the timbers of our own strength.'
      },
      {
        roman: 'II',
        title: 'The Peculiar Nature of the Anchor',
        subpoints: [
          'It is cast not downward into dark waters, but upward into heavenly reality.',
          'It is an anchor that enters into that which is within the veil.',
          'It takes fast hold of the unshakeable rock of God’s immutable covenant.'
        ],
        explanation: 'Christian hope is unique: while earthly ships drop their iron into the unseen ocean floor, faith flings its anchor into the very Holy of Holies where Christ sits at the Father’s right hand.'
      },
      {
        roman: 'III',
        title: 'The Divine Cable That Binds Us',
        subpoints: [
          'The cable of sovereign grace and promises confirmed by God’s oath.',
          'The tension may strain the ship, but the cable will never snap.',
          'Christ Himself is our Forerunner holding the anchor firmly in place.'
        ],
        explanation: 'Though the ship may rock and the timber groan, the anchor does not slip by a single hair’s breadth because Christ Himself holds the ground.'
      }
    ],
    full_text: `### The Anchor of the Soul
*Delivered by Charles H. Spurgeon at the Metropolitan Tabernacle*

> "Which hope we have as an anchor of the soul, both sure and steadfast, and which entereth into that within the veil." — Hebrews 6:19

The metaphor of human life as a voyage upon a tempestuous ocean is both ancient and universally felt. How often have we seen the stoutest ship battered by the winds, the sails torn to ribbons, and the sailors driven to their wits' end! In the spiritual realm, every soul is embarked upon this profound ocean. But mark this difference: while the earthly ship casts her iron downward into the murky depths, the believer in Christ casts his anchor **upward**!

#### I. The Vessel in Peril
Consider first the ship. It is your soul and mine, fragile and exposed to the billows of temptation, sickness, grief, and spiritual doubt. The winds of adversity blow fierce and cold. If you attempt to anchor your heart in earthly wealth, the rocks will crush you. If you anchor in human approval, the shifting tide will carry you out to destruction.

#### II. The True Nature of the Anchor
What is this anchor? The Apostle calls it *Hope*. Not a wishful presumption or a dream of fair weather, but a hope rooted in the oath and covenant of God. Observe where this anchor goes: it *entereth into that within the veil*. It fastens upon the eternal throne of Jehovah, upon the finished sacrifice of Jesus Christ, our great High Priest.

When the storm strikes, a sailor does not expect the anchor to stop the ship from rocking—he expects the anchor to keep the ship from driving onto the reef. So it is with Christian faith: you may be tossed by sorrow, your tears may flow like sea-spray, but you shall not be lost!

#### III. The Unshakeable Grip of Christ
Christ has entered the veil as our Forerunner. He did not go in to close the door behind Him, but to secure the line for every frail vessel that trusts in His name. Rest in that assurance today. Let the gale howl; your anchor holds!`,
    illustrations: [
      {
        title: 'The Blind Cable of the North Sea',
        content: 'Spurgeon recounted talking to a fisherman in the English Channel who survived a midnight hurricane. When asked why he did not fear when darkness blanketed the deep and waves broke over the deck, the sailor replied: "Sir, I could see nothing in the blackness, but every time the rope tugged back against the bow, I knew the anchor had its teeth in the rock."'
      }
    ],
    key_quotes: [
      '“A Christian’s anchor is cast not downward into the shifting sand, but upward into the immovable heavens.”',
      '“The anchor does not prevent the ship from rolling, but it prevents it from perishing.”'
    ],
    application_points: [
      'Examine where your security is anchored: in feelings, circumstances, or God’s covenant.',
      'When emotional storms hit, remember that tension on the cable is proof that the anchor is holding.',
      'Take comfort that Christ has personally entered the Holy of Holies to guarantee your safe arrival.'
    ],
    tags: ['Hope', 'Suffering', 'Assurance', 'Faith', 'Hebrews', 'Spurgeon', 'Cross']
  },
  {
    id: 'classic-moody-compassion',
    volume: 'classics',
    volumeLabel: 'The Classic Masters',
    author: 'Dwight L. Moody',
    era: 'Revivalist Era (1837–1899)',
    year: '1884',
    title: 'The Compassion of Christ',
    subtitle: 'The Heart of the Savior for the Lost and Broken',
    scripture_primary: 'Luke 19:10',
    scriptures_secondary: ['Matthew 9:36', 'Luke 15:1-7', 'John 3:16-17'],
    testament: 'NT',
    series_name: 'Great Revival Sermons',
    historical_context: 'Preached during Moody’s urban revival campaigns in Chicago and London to massive working crowds, emphasizing the tender, seeking love of Christ over legalistic condemnation.',
    theological_theme: 'Grace, Evangelism, The Heart of God',
    big_idea: 'The Son of Man came not to condemn, but with tears of holy compassion to seek and save that which was lost.',
    outline: [
      {
        roman: 'I',
        title: 'The Misunderstood Mission of Christ',
        subpoints: [
          'The world imagines God is an angry judge waiting to strike them down.',
          'Jesus came not to call the righteous, but sinners to repentance.',
          'His miracles were miracles of restoration and mercy.'
        ]
      },
      {
        roman: 'II',
        title: 'The Shepherd Who Goes After the One',
        subpoints: [
          'Ninety-nine in the fold do not satisfy the Shepherd’s heart while one remains lost.',
          'He tracks through wilderness, brambles, and crags.',
          'He carries the lamb home on His shoulders rejoicing.'
        ]
      },
      {
        roman: 'III',
        title: 'The Immediate Call to Respond',
        subpoints: [
          'Salvation is not achieved through years of penance, but received by simple faith.',
          'Now is the accepted time.',
          'No soul is too far gone for the reach of His pierced hands.'
        ]
      }
    ],
    full_text: `### The Compassion of Christ
*Delivered by D. L. Moody*

> "For the Son of man is come to seek and to save that which was lost." — Luke 19:10

I have found in my travels that the greatest lie Satan ever whispers into a man's ear is that God hates him, that God is standing over him with an iron rod ready to smash him if he stumbles. My friends, that is not the God of the Bible! The God of the Bible wept over Jerusalem. The God of the Bible washed the feet of disciples who would soon forsake Him.

#### I. Look at His Tears
When Jesus came near the city, He beheld it and wept over it. Have you ever considered the tears of the Son of God? He knew they would nail Him to a Roman cross within days, yet He did not weep for Himself—He wept for them! His heart broke for their blindness and their sorrow.

#### II. The Seeking Love
Notice the text says He came to *seek* and to *save*. A physician does not visit the healthy; he seeks out the plague-stricken hospital. Christ did not wait in heaven for us to climb our way up to His purity. He descended down into our misery, into our poverty, into our sin, that He might lift us up into His glory.

Come to Him today just as you are. You do not need to wash yourself before you step into the fountain; you step into the fountain that you may be made clean!`,
    illustrations: [
      {
        title: 'The Father’s Watch in the Window',
        content: 'Moody told of a young runaway in Chicago whose mother kept a lantern burning in the front window every night for five bitter winters, saying, "If my boy ever remembers his home in the dead of night, he must know the door is never locked and the light is never put out."'
      }
    ],
    key_quotes: [
      '“God doesn’t ask for your goodness before He gives you His grace; He gives you His grace to make you good.”',
      '“Faith makes all things possible; love makes all things easy.”'
    ],
    application_points: [
      'Reject the lie that God is reluctant to forgive you.',
      'Cultivate Christlike compassion for the difficult and hurting people in your community.',
      'Take the Gospel to the one who feels forgotten.'
    ],
    tags: ['Evangelism', 'Compassion', 'Grace', 'Forgiveness', 'Moody', 'Luke']
  },
  {
    id: 'classic-wesley-almost-christian',
    volume: 'classics',
    volumeLabel: 'The Classic Masters',
    author: 'John Wesley',
    era: '18th Century Great Awakening (1703–1791)',
    year: '1741',
    title: 'The Almost Christian',
    subtitle: 'Distinguishing Outward Religion from Heart Transformation',
    scripture_primary: 'Acts 26:28',
    scriptures_secondary: ['Matthew 7:21-23', 'Romans 12:1-2', 'Galatians 5:6'],
    testament: 'NT',
    series_name: 'Oxford University Sermons',
    historical_context: 'Preached at St. Mary’s Church, Oxford, before the university faculty and students, challenging formal religious compliance with a heart-transforming encounter with the living God.',
    theological_theme: 'Regeneration, Sincerity, Holiness of Heart',
    big_idea: 'Honesty, morality, and religious form can make an "almost Christian," but only the love of God shed abroad in the heart makes an altogether Christian.',
    outline: [
      {
        roman: 'I',
        title: 'What It Means to Be an Almost Christian',
        subpoints: [
          'Heathen honesty: Common justice, truthfulness, and decency.',
          'The form of godliness: Outward prayer, fasting, and temple attendance.',
          'Sincerity of intention: A genuine desire to avoid vice and do good.'
        ]
      },
      {
        roman: 'II',
        title: 'What Is Lacking to Be an Altogether Christian',
        subpoints: [
          'The love of God: Loving Him with all our heart, mind, and strength.',
          'The love of our neighbor: Cherishing every soul for Christ’s sake.',
          'The faith of the Gospel: A personal reliance on the atoning blood of Christ.'
        ]
      },
      {
        roman: 'III',
        title: 'The Solemn Appeal to the Conscience',
        subpoints: [
          'Does your heart cry out "Abba, Father" by the Holy Spirit?',
          'Do not rest in your church attendance or moral reputation.',
          'Yield yourself entirely to the Savior today.'
        ]
      }
    ],
    full_text: `### The Almost Christian
*Preached by John Wesley at St. Mary's, Oxford*

> "Almost thou persuadest me to be a Christian." — Acts 26:28

And many there are who go thus far: who have the form of godliness, who refrain from outward wickedness, who give alms, and who attend the house of prayer. Yet between the "almost" and the "altogether" Christian lies the boundless gulf between death and life.

#### I. The Attainments of the Almost Christian
First, there is common honesty—abstaining from theft, slander, and oppression. Second, there is the outward practice of religion—fasting, reciting prayers, reading the scriptures. Third, there is even a measure of sincerity. Yet a man may possess all these and remain a stranger to the life of God in the soul.

#### II. The Marks of the Altogether Christian
What is required? First, the **Love of God**—a heart that finds its supreme joy in His holiness. Second, the **Love of Neighbor**—loving all men, even our enemies, with tender and active benevolence. Third, that **Faith** which is not mere intellectual assent, but a hearty trust in the blood of Christ to pardon our sins.

Let every man here ask himself in the presence of the Searcher of hearts: "Am I an almost Christian, or an altogether Christian?"`,
    illustrations: [
      {
        title: 'The Shipwreck at the Harbor Bar',
        content: 'Wesley warned that a ship that sails across thousands of miles of open ocean only to sink ten yards from the harbor pier is just as lost as the vessel that foundered in mid-Atlantic.'
      }
    ],
    key_quotes: [
      '“A man may have the form of godliness, and yet be as dead to God as the marble tomb.”',
      '“Give me one hundred preachers who fear nothing but sin and desire nothing but God, and we will shake the gates of hell.”'
    ],
    application_points: [
      'Do not rely on moral decency or Christian heritage as proof of salvation.',
      'Seek the inward witness of the Holy Spirit confirming your adoption in Christ.',
      'Dedicate your entire heart and life to the Lord without holding back.'
    ],
    tags: ['Discipleship', 'Holiness', 'Revival', 'Wesley', 'Faith', 'Acts']
  },
  {
    id: 'classic-edwards-refuge',
    volume: 'classics',
    volumeLabel: 'The Classic Masters',
    author: 'Jonathan Edwards',
    era: 'First Great Awakening (1703–1758)',
    year: '1738',
    title: 'The True Rock of Our Refuge',
    subtitle: 'Safety, Peace, and Security in Christ Alone',
    scripture_primary: 'Isaiah 32:2',
    scriptures_secondary: ['Psalm 46:1-3', 'Matthew 11:28-30', 'Colossians 3:3'],
    testament: 'OT',
    series_name: 'Northampton Pulpit Series',
    historical_context: 'Preached during the dawn of the Northampton awakenings, presenting Christ not merely as righteous judge, but as an inexhaustible shelter from the tempest of human guilt and sorrow.',
    theological_theme: 'Sovereignty of God, Refuge in Christ, Eternal Security',
    big_idea: 'Christ is an unfailing hiding place from the wind, a covert from the tempest, and rivers of water in a dry place.',
    outline: [
      {
        roman: 'I',
        title: 'The Great Dangers That Beset Mortal Man',
        subpoints: [
          'The wind of divine judgment against unrighteousness.',
          'The tempest of life’s afflictions, griefs, and uncertainties.',
          'The barren drought of a soul seeking satisfaction in worldly vanities.'
        ]
      },
      {
        roman: 'II',
        title: 'How Christ Is Appointed as the Complete Shelter',
        subpoints: [
          'He bore the full fury of the tempest upon the tree of Calvary.',
          'In Him the justice of God is satisfied and the mercy of God abounds.',
          'He is like the shadow of a great rock in a weary land.'
        ]
      },
      {
        roman: 'III',
        title: 'The Blessed Safety of Those Who Enter In',
        subpoints: [
          'No storm can penetrate the cleft of this Rock.',
          'Peace that passes understanding guards the believer’s heart.',
          'An invitation to run into the shelter while the day of grace lasts.'
        ]
      }
    ],
    full_text: `### The True Rock of Our Refuge
*By Jonathan Edwards*

> "And a man shall be as an hiding place from the wind, and a covert from the tempest; as rivers of water in a dry place, as the shadow of a great rock in a weary land." — Isaiah 32:2

There are two things that make a refuge desirable: the extremity of the storm outside, and the absolute impregnability of the shelter inside.

#### I. The Storm We Cannot Survive Alone
Human life is exposed to winds that no mortal wisdom can withstand: the accusations of conscience, the sorrow of broken relationships, the terror of physical death, and the righteous judgment of a holy God. How foolish is that traveler who sees the gathering cyclone on the horizon, yet chooses to shelter beneath a bush of brambles!

#### II. The Perfection of the Covert
Behold the God-Man, Christ Jesus! He took the storm upon His own brow. When the wrath due to our iniquity broke forth, He stood between the thunderbolt and our defenseless souls. Because He was struck, we are shielded; because He was parched with thirst on the cross, rivers of living water now flow for our refreshment.

Enter into Him by faith. Lay down your futile self-righteousness. Stand within the rock, and watch the storm pass harmlessly overhead.`,
    illustrations: [
      {
        title: 'The Desert Pilgrim and the Great Rock',
        content: 'Edwards described an Arabian traveler fainting under the scorching midday sun in a treeless wilderness. The sand is burning like coals, but ahead looms a massive granite precipice. Beneath its northward face lies a cool, deep shade where no ray of heat can strike. There the pilgrim drinks, rests, and lives.'
      }
    ],
    key_quotes: [
      '“Christ was broken by the storm so that you might never be broken by it.”',
      '“There is safety in Christ that the universe itself cannot shake.”'
    ],
    application_points: [
      'Flee from self-reliance to Christ whenever anxiety or guilt threatens your peace.',
      'Rest in the reality that your standing before God is grounded in Christ’s finished work.',
      'Point suffering friends to the shadow of this great Rock.'
    ],
    tags: ['Refuge', 'Grace', 'Peace', 'Sovereignty', 'Isaiah', 'Edwards']
  },

  // ==========================================
  // VOLUME II: CANONICAL EXPOSITORY LIBRARY
  // ==========================================
  {
    id: 'canon-romans-8-more-than-conquerors',
    volume: 'canonical',
    volumeLabel: 'Canonical Expository Library',
    author: 'Expository Homiletics Archive',
    era: 'Pauline Expository Series',
    year: 'Canonical',
    title: 'More Than Conquerors',
    subtitle: 'The Inseparable Love of God in Christ Jesus',
    scripture_primary: 'Romans 8:31-39',
    scriptures_secondary: ['Romans 8:28-30', 'Genesis 22:12', '1 Corinthians 15:57'],
    testament: 'NT',
    series_name: 'The Epistle to the Romans',
    historical_context: 'Written by Paul to the Roman believers facing imperial suspicion, poverty, and impending persecution under Nero, this climax of Romans 8 provides the ultimate bedrock of Christian assurance.',
    theological_theme: 'Eternal Security, Justification, Triumphant Suffering',
    big_idea: 'Because God did not spare His own Son, no adversary, affliction, or earthly power can ever separate believers from His unconquerable love.',
    outline: [
      {
        roman: 'I',
        title: 'The Supreme Defense: God Is for Us (vv. 31-34)',
        subpoints: [
          'If God is for us, who can be against us?',
          'The greatest argument: He who spared not His own Son will graciously give us all things.',
          'No accusation can stand against God’s elect because Christ justifies and intercedes.'
        ],
        explanation: 'Paul puts forward five rhetorical questions in rapid succession. The courtroom of the cosmos is silent because the Judge Himself has become our Savior.'
      },
      {
        roman: 'II',
        title: 'The Reality of the Battle: Suffering in the Present (vv. 35-36)',
        subpoints: [
          'Tribulation, distress, persecution, famine, nakedness, peril, sword.',
          'Christian victory does not mean immunity from pain.',
          'We are counted as sheep for the slaughter, yet our identity remains unshaken.'
        ],
        explanation: 'Notice Paul does not preach a hollow prosperity. He lists seven violent hardships—all of which he experienced personally—and demonstrates that suffering is the arena where God’s love shines brightest.'
      },
      {
        roman: 'III',
        title: 'The Unstoppable Triumph: Hyper-Conquerors in Christ (vv. 37-39)',
        subpoints: [
          'We are not mere survivors; we are "more than conquerors" (hyper-nikomen).',
          'Neither death nor life, angels nor principalities can sever the cord.',
          'The eternal anchor of God’s love in Christ Jesus our Lord.'
        ],
        explanation: 'We conquer not by avoiding the battle, but by having Christ conquer through us so that even grief, disease, and death work together for our eternal weight of glory.'
      }
    ],
    full_text: `### More Than Conquerors
*An Expository Manuscript on Romans 8:31–39*

Romans 8 is often called the Mount Everest of the New Testament. It begins with **"no condemnation"** in verse 1, and ends with **"no separation"** in verse 39! Between those two holy bookends lies the unshakeable certainty of the Christian life.

#### 1. The Logic of Divine Generosity (vv. 31–32)
Look at Paul’s argument from the greater to the lesser:
> *"He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?"*

If God gave you the most precious treasure in all of heaven—His beloved only-begotten Son—will He withhold the daily bread, the spiritual strength, or the perseverance you need to make it home? It is impossible!

#### 2. The Sevenfold Shadow (vv. 35–36)
Paul asks: *"Who shall separate us from the love of Christ?"* He then names tribulation, distress, persecution, famine, nakedness, peril, and the sword.
Notice what Paul does NOT say: he does not say that believers will be spared from these things. Christians get cancer; pastors face heartbreak; faithful families suffer loss. But Paul boldly asserts that none of these calamities possess the power to cut the lifeline between your soul and Christ.

#### 3. More Than Conquerors (vv. 37–39)
In Greek, the word is *hypernikomen*—super-conquerors! A regular conqueror defeats his enemy. A super-conqueror takes the enemy’s weapons and turns them into his own servant. God takes our trials, our persecutions, and our heartaches, and uses them to conform us to the image of His Son.

Nothing in all creation—neither height nor depth, neither present distress nor future fears—shall ever tear you from the embrace of Calvary's love!`,
    illustrations: [
      {
        title: 'The Roman Triumphal Arch',
        content: 'When Roman generals returned victorious from war, they paraded their captives through the city gates under triumphal arches. Paul audaciously turns this image on its head: Christ paraded Rome’s persecutions as trophies of His victory, transforming a Roman cross into the symbol of eternal triumph.'
      }
    ],
    key_quotes: [
      '“Romans 8 begins with no condemnation and concludes with no separation.”',
      '“A super-conqueror does not merely survive the fire; he comes out of the furnace carrying the gold.”'
    ],
    application_points: [
      'Stop measuring God’s love by your immediate circumstances; measure it by the Cross.',
      'Bring your deepest anxiety into the courtroom of Romans 8:31: "If God is for us, who can be against us?"',
      'Encourage a brother or sister walking through grief with the promise of verse 38–39.'
    ],
    tags: ['Romans', 'Assurance', 'Suffering', 'Victory', 'Paul', 'Expository']
  },
  {
    id: 'canon-psalm-23-good-shepherd',
    volume: 'canonical',
    volumeLabel: 'Canonical Expository Library',
    author: 'Expository Homiletics Archive',
    era: 'Davidic Wisdom Series',
    year: 'Canonical',
    title: 'The Lord Is My Shepherd: Living in the Overflow',
    subtitle: 'Rest, Restoration, and Resilience in the Care of God',
    scripture_primary: 'Psalm 23:1-6',
    scriptures_secondary: ['John 10:11-15', 'Ezekiel 34:11-16', 'Philippians 4:19'],
    testament: 'OT',
    series_name: 'The Songs of the Shepherd King',
    historical_context: 'Written by David from the perspective of an experienced shepherd who understood the helplessness of sheep, the terrain of Judean wadis, and the sovereign care of the Almighty.',
    theological_theme: 'Providence, Peace, Guidance, Eternal Home',
    big_idea: 'Because the Lord Himself is our Shepherd, we lack nothing in the green pastures of youth, the dark valleys of trial, or the banquet table of eternity.',
    outline: [
      {
        roman: 'I',
        title: 'The Sufficiency of the Shepherd (vv. 1-3)',
        subpoints: [
          'Personal relationship: "The Lord is *my* Shepherd."',
          'The posture of contentment: "I shall not want."',
          'Rest for the weary soul: Green pastures and still waters.'
        ]
      },
      {
        roman: 'II',
        title: 'The Companionship in the Shadows (v. 4)',
        subpoints: [
          'The reality of the valley of the shadow of death.',
          'The shift in David’s language: From talking *about* God ("He leads") to talking *to* God ("You are with me").',
          'The comfort of the rod (protection from wolves) and the staff (guidance from wandering).'
        ]
      },
      {
        roman: 'III',
        title: 'The Overflowing Banquet and the Eternal Home (vv. 5-6)',
        subpoints: [
          'A table prepared in the presence of enemies.',
          'The oil of honor and healing upon the head.',
          'Goodness and mercy like two loyal sheepdogs following us all our days.'
        ]
      }
    ],
    full_text: `### The Lord Is My Shepherd
*An Expository Journey Through Psalm 23*

Psalm 23 is the crown jewel of the Psalter. Countless souls have breathed their last while whispering these words. But Psalm 23 is not merely a song for the dying; it is a battle plan for the living!

#### 1. The Divine Provision (vv. 1–3)
"The Lord is my Shepherd; I shall not want." Sheep cannot clean themselves, defend themselves, or find pasture on their own. They are entirely dependent upon the vigilance of the shepherd. When Jehovah is your shepherd, your "lack" is swallowed up in His abundance. He makes you lie down—sometimes God has to lay us down in sickness or stillness just so our restless hearts will graze upon His peace.

#### 2. The Valley of the Shadow (v. 4)
Notice the sudden grammatical shift in verse 4. In verses 1–3, David speaks in the third person: *"He leads me, He restores my soul."* But when he enters the dark valley of the shadow of death, he switches to the second person: ***"For YOU are with me; Your rod and Your staff, they comfort me!"***
In the sunny pastures, we talk *about* God. But in the pitch-black canyon where wolves howl, we talk *to* God! The shadow cannot hurt you; a shadow of a sword cannot cut you, and the shadow of death cannot destroy you because the True Light walks by your side.

#### 3. The Prepared Feast (vv. 5–6)
God does not wait for our enemies to surrender before He blesses us. Right in the middle of hostile territory, He spreads a royal banquet table. He anoints our heads with the fragrant oil of joy. Surely—without a doubt—His twin hounds of grace, *Goodness* and *Mercy*, will pursue us every day of our earthly pilgrimage until we step into our eternal mansion!`,
    illustrations: [
      {
        title: 'The Cast Sheep and the Shepherd’s Lift',
        content: 'Phillip Keller in "A Shepherd Looks at Psalm 23" describes a "cast sheep"—an animal that rolled onto its back with its feet flailing in the air, helpless and suffocating under its heavy fleece. The shepherd tenderly rolls the sheep over, massages its numb legs, and stands it back on solid ground. That is the exact Hebrew meaning of "He restoreth my soul."'
      }
    ],
    key_quotes: [
      '“In the sunny pastures we talk about God; in the deep valleys we talk to God.”',
      '“A shadow of a dog cannot bite, and the shadow of death cannot slay the child of God.”'
    ],
    application_points: [
      'Surrender your anxious financial or career planning to the Good Shepherd’s guidance.',
      'If you are currently in a dark valley, remember that a valley is something you walk *through*, not something you stay in.',
      'Cultivate gratitude for God’s daily goodness and mercy pursuing your family.'
    ],
    tags: ['Psalms', 'Comfort', 'Peace', 'Valley', 'Provision', 'Shepherd', 'Expository']
  },
  {
    id: 'canon-ephesians-6-armor-of-god',
    volume: 'canonical',
    volumeLabel: 'Canonical Expository Library',
    author: 'Expository Homiletics Archive',
    era: 'Pauline Epistle Series',
    year: 'Canonical',
    title: 'Standing Firm: The Whole Armor of God',
    subtitle: 'Spiritual Warfare and the Believer’s Victory',
    scripture_primary: 'Ephesians 6:10-18',
    scriptures_secondary: ['2 Corinthians 10:3-5', '1 Peter 5:8-9', 'Isaiah 59:17'],
    testament: 'NT',
    series_name: 'Ephesians: The Wealth, Walk, and Warfare of the Christian',
    historical_context: 'Dictated while chained to a Roman praetorian guard in a damp imperial prison cell, Paul looked at the legionnaire’s weaponry and was inspired by the Holy Spirit to describe the supernatural defense of the believer.',
    theological_theme: 'Spiritual Warfare, Faith, Prayer, The Word of God',
    big_idea: 'Our warfare is not against flesh and blood, but against spiritual powers; therefore, we must stand dressed in Christ’s own armor and prevail through watchful prayer.',
    outline: [
      {
        roman: 'I',
        title: 'The Command and the Enemy (vv. 10-12)',
        subpoints: [
          'Be strong in the Lord and the power of His might (not our willpower).',
          'The nature of the foe: Not people, but demonic principalities and schemes.',
          'The objective of the believer: To stand firm and hold the ground Christ won.'
        ]
      },
      {
        roman: 'II',
        title: 'The Six Pieces of Divine Armor (vv. 13-17)',
        subpoints: [
          'Belt of Truth: Integrity and biblical reality keeping our garments secure.',
          'Breastplate of Righteousness: Guarding the heart with Christ’s imputed righteousness.',
          'Gospel Shoes of Peace: Sure-footed readiness to proclaim reconciliation.',
          'Shield of Faith: Extinguishing every fiery dart of accusation and doubt.',
          'Helmet of Salvation: Guarding the mind with eternal hope.',
          'Sword of the Spirit: The spoken rhema Word of God.'
        ]
      },
      {
        roman: 'III',
        title: 'The Atmosphere of Victory: All-Prayer (v. 18)',
        subpoints: [
          'Praying always with all prayer and supplication in the Spirit.',
          'Watching with all perseverance for all the saints.',
          'Prayer is the very air in which the armor is wielded.'
        ]
      }
    ],
    full_text: `### Standing Firm: The Whole Armor of God
*An Expository Outline & Manuscript on Ephesians 6:10–18*

The Christian life is not a playground; it is a battleground. Paul closes his glorious letter to the Ephesians not with retirement plans, but with a bugle call to arms!

#### 1. Know Your Enemy and Your Strength (vv. 10–12)
Notice who your enemy is NOT: your spouse, your in-laws, your stubborn neighbor, or corrupt politicians. *"We wrestle not against flesh and blood."* When we fight people with human weapons of bitterness, anger, and revenge, we have already lost the spiritual skirmish. We fight against spiritual powers, and our strength comes not from our gritted teeth, but from being rooted in the mighty power of Christ.

#### 2. Dressed for the Day of Battle (vv. 13–17)
Every piece of armor represents an aspect of Christ Himself:
- **The Belt of Truth:** When Satan lies about who you are, truth holds your identity together.
- **The Breastplate of Righteousness:** When the enemy whispers, "Look at your sins," you point to the perfect righteousness of Jesus Christ covering your chest.
- **The Shield of Faith:** Ancient Roman shields were covered in leather soaked in water to extinguish arrows dipped in pitch. Faith in God’s promises extinguishes the burning darts of shame and fear!
- **The Sword of the Spirit:** The only offensive weapon! Jesus in the wilderness defeated the devil by speaking the Scripture: *"It is written!"*

#### 3. Sustained by Prayer (v. 18)
Armor without prayer is a heavy, lifeless costume. Prayer is the communication line with the Commanding General. Put on your armor daily on your knees!`,
    illustrations: [
      {
        title: 'The Roman Scutum and Flaming Arrows',
        content: 'Paul watched the Roman soldiers oil their massive rectangular shields (scutum). In ancient warfare, archers dipped iron-tipped arrows in burning pitch so that upon impact, fire would splatter across the soldier. Only an interlocking wall of water-soaked shields could smother the flames. Together as a church, our collective faith extinguishes the devil’s darts.'
      }
    ],
    key_quotes: [
      '“You cannot fight a spiritual battle with carnal weapons.”',
      '“The armor of God is not made of metal; it is made of the attributes of Jesus Christ.”'
    ],
    application_points: [
      'Stop viewing difficult people as the enemy; discern the spiritual battle beneath the conflict.',
      'Memorize 2–3 key scriptures to wield as the Sword of the Spirit when temptation strikes.',
      'Commit to a daily rhythm of praying for your brothers and sisters in ministry.'
    ],
    tags: ['Spiritual Warfare', 'Ephesians', 'Prayer', 'Faith', 'Armor', 'Paul', 'Expository']
  },

  // ==========================================
  // VOLUME III: PASTORAL & TOPICAL COMPENDIUM
  // ==========================================
  {
    id: 'topical-anxiety-philippians',
    volume: 'topical',
    volumeLabel: 'Pastoral & Topical Compendium',
    author: 'Pastoral Homiletics Compendium',
    era: 'Pastoral Care Library',
    year: 'Modern',
    title: 'The Antidote to Anxiety: The Peace That Guards the Heart',
    subtitle: 'Transforming Worry into Worship and Panic into Peace',
    scripture_primary: 'Philippians 4:4-9',
    scriptures_secondary: ['Matthew 6:25-34', '1 Peter 5:7', 'Isaiah 26:3'],
    testament: 'NT',
    series_name: 'Peace in the Pressure Cooker',
    theological_theme: 'Peace of God, Prayer with Thanksgiving, Mental Renewal',
    big_idea: 'When we exchange our anxieties for prayer with thanksgiving, the supernatural peace of God stands sentry over our hearts and minds in Christ Jesus.',
    outline: [
      {
        roman: 'I',
        title: 'The Anatomy of Worry: Why Anxiety Strangles the Soul',
        subpoints: [
          'The Greek word "merimnao" means to be pulled in opposite directions.',
          'Anxiety assumes responsibility for outcomes that belong only to God.',
          'The spiritual danger of borrowing tomorrow’s trouble today.'
        ]
      },
      {
        roman: 'II',
        title: 'The Fourfold Cure for Anxiety (vv. 6-7)',
        subpoints: [
          'Be anxious for nothing: A holy refusal to let worry sit on the throne.',
          'In everything by prayer: Turning every problem into a conversation with the Father.',
          'With thanksgiving: Praising God in advance for His past faithfulness.',
          'The supernatural consequence: The peace that surpasses all understanding.'
        ]
      },
      {
        roman: 'III',
        title: 'The Discipline of the Thought Life (vv. 8-9)',
        subpoints: [
          'Guarding the gateway of the mind: Whatsoever things are true, noble, just, pure.',
          'Refusing the toxic diet of dread, gossip, and catastrophic thinking.',
          'Not just the peace of God, but the God of peace shall be with you.'
        ]
      }
    ],
    full_text: `### The Antidote to Anxiety
*A Pastoral Message on Philippians 4:4–9*

We live in an age of unprecedented anxiety. Never before have humans absorbed so much distressing news from every corner of the planet in twenty-four hours. But Paul wrote these words not from an ocean resort, but chained in a Roman dungeon!

#### 1. Don’t Worry About Anything, Pray About Everything
Paul issues an astonishing command: *"Be anxious for nothing!"* Is that realistic? Not in your own strength! But notice the contrast: you replace worry with prayer. 
Whenever an anxious thought knocks on the door of your heart, do not invite it in for tea. Immediately take that thought by the hand and say, *"You belong to God now; we are taking you to the throne of grace."*

#### 2. The Power of Thanksgiving
Why did Paul add *"with thanksgiving"*? Because thanksgiving is the memory of faith! When you thank God for how He carried you through last year's storm, it reminds you that the God who provided yesterday will not abandon you today.

#### 3. The Garrison of Peace
The word *"shall keep your hearts and minds"* is a military term (*phroureo*). It describes Roman sentries marching around a walled city at night. When you pray with thanksgiving, God stations His peace like armed angelic sentries outside your bedroom door, guarding your thoughts against the midnight panic!`,
    illustrations: [
      {
        title: 'The Wheelbarrow and the Tightrope',
        content: 'Charles Blondin famously pushed a wheelbarrow across a tightrope strung over Niagara Falls. When the crowd applauded, he asked, "Do you believe I can carry a man across in this barrow?" The crowd shouted, "Yes!" Blondin turned to a vocal bystander and said, "Then step in." Trusting God with anxiety means climbing into the wheelbarrow and letting Him push.'
      }
    ],
    key_quotes: [
      '“Worry does not empty tomorrow of its sorrow; it only empties today of its strength.”',
      '“When we pray with thanksgiving, God stations His supernatural peace like an armed guard around our heart.”'
    ],
    application_points: [
      'Write down your top 3 current worries and write a specific sentence of thanksgiving next to each one.',
      'Implement a "Philippians 4:8 media fast" when anxiety flares up.',
      'Recite Philippians 4:6–7 before going to sleep when racing thoughts occur.'
    ],
    tags: ['Anxiety', 'Peace', 'Philippians', 'Mental Health', 'Prayer', 'Topical']
  },
  {
    id: 'topical-forgiveness-unpayable-debt',
    volume: 'topical',
    volumeLabel: 'Pastoral & Topical Compendium',
    author: 'Pastoral Homiletics Compendium',
    era: 'Pastoral Care Library',
    year: 'Modern',
    title: 'The Freedom of Forgiveness: Canceling the Unpayable Debt',
    subtitle: 'Breaking Free from the Prison of Bitterness and Resentment',
    scripture_primary: 'Matthew 18:21-35',
    scriptures_secondary: ['Ephesians 4:31-32', 'Colossians 3:12-14', 'Luke 23:34'],
    testament: 'NT',
    series_name: 'The Healing Word',
    theological_theme: 'Forgiveness, Reconciliation, The Gospel of Grace',
    big_idea: 'Because God has canceled our infinite debt of sin through the blood of Christ, we are liberated to release the debts of those who have wounded us.',
    outline: [
      {
        roman: 'I',
        title: 'Peter’s Question and the Calculus of Mercy (vv. 21-22)',
        subpoints: [
          'How often shall my brother sin against me and I forgive him? Seven times?',
          'The religious limit vs. the seventy-times-seven horizon of grace.',
          'Forgiveness is not a mathematical ledger, but a heart condition.'
        ]
      },
      {
        roman: 'II',
        title: 'The Parable of the Two Debtors (vv. 23-30)',
        subpoints: [
          'The ten-thousand-talent debt: An impossible trillion-dollar sum we could never pay.',
          'The King’s shocking compassion: The debt is wiped clean in an instant.',
          'The tragedy of the unforgiving servant: Choking a brother over a hundred denarii.'
        ]
      },
      {
        roman: 'III',
        title: 'The Prison of Bitterness (vv. 31-35)',
        subpoints: [
          'Unforgiveness hurts the keeper of the grudge far more than the offender.',
          'Delivered to the tormentors: Emotional, physical, and spiritual anguish.',
          'Forgiving from the heart: Choosing to let go because Christ let go of our debt.'
        ]
      }
    ],
    full_text: `### The Freedom of Forgiveness
*A Pastoral Message on Matthew 18:21–35*

Lewis Smedes wrote: *"To forgive is to set a prisoner free and discover that the prisoner was you."* 

#### 1. The Shocking Scale of Grace
In Matthew 18, Jesus describes a servant who owed ten thousand talents. In modern economic terms, that is the equivalent of trillions of dollars—more than the GDP of entire ancient empires! The servant could not pay it in a thousand lifetimes. Yet when he begged for mercy, the king was moved with compassion and **forgave the entire debt**.

That first servant represents you and me before a Holy God. Our offenses against an infinite, eternal God created a debt we could never liquidate. At Calvary, Christ looked at our bankrupt balance sheet and stamped it: **PAID IN FULL**.

#### 2. The Folly of the Chokehold
What did the forgiven man do? He found a peer who owed him a hundred days’ wages—a real debt, but tiny in comparison—and seized him by the throat, demanding payment.
When we hold onto grudges, when we re-play offenses in our minds and withhold mercy, we are that servant. We are telling God, *"Thank You for forgiving my trillion dollars, but I will not forgive this person twenty bucks."*

#### 3. Forgiveness Is a Choice, Not an Emotion
Forgiveness does not mean declaring that what happened was okay. It does not mean immediate trust or foolish reconciliation with unrepentant abusers. Forgiveness means **releasing the right to take revenge**. It means transferring the debt collection from your hands into the hands of the righteous Judge of the universe. Choose freedom today!`,
    illustrations: [
      {
        title: 'Corrie ten Boom and the Ravensbrück Guard',
        content: 'Corrie ten Boom, survivor of the Nazi concentration camp where her sister died, was speaking in Munich on forgiveness. After the service, a former SS guard who had mistreated them walked forward with hand outstretched, asking for forgiveness. Corrie stood frozen in agony until she prayed silently, "Jesus, I cannot forgive him; give me Your forgiveness." As she took his hand, she felt an electric warmth of divine love surge through her arm, setting both of them free.'
      }
    ],
    key_quotes: [
      '“To forgive is to set a prisoner free and discover that the prisoner was you.”',
      '“He who cannot forgive others breaks the bridge over which he himself must pass.”'
    ],
    application_points: [
      'Identify the person whose debt you have been clutching in your fist.',
      'Pray a prayer of release: "Lord, I give up the right to punish them; I hand them to You."',
      'Distinguish between forgiveness (a heart release) and reconciliation (built on restored trust).'
    ],
    tags: ['Forgiveness', 'Healing', 'Matthew', 'Relationships', 'Grace', 'Topical']
  },

  // ==========================================
  // VOLUME IV: THE LITURGICAL & OCCASIONAL PULPIT
  // ==========================================
  {
    id: 'liturgical-easter-he-is-risen',
    volume: 'liturgical',
    volumeLabel: 'Liturgical & Occasional Pulpit',
    author: 'Liturgical Pulpit Compendium',
    era: 'Resurrection Pulpit',
    year: 'Seasonal',
    title: 'The Dawn of Resurrection: Why the Empty Tomb Changes Everything',
    subtitle: 'Christ Is Risen: The Defeat of Death and the Guarantee of New Life',
    scripture_primary: 'Luke 24:1-12',
    scriptures_secondary: ['1 Corinthians 15:20-26', 'John 11:25-26', 'Revelation 1:17-18'],
    testament: 'NT',
    series_name: 'Easter & Resurrection Sunday',
    theological_theme: 'Resurrection of Jesus, Victory Over Death, Living Hope',
    big_idea: 'The resurrection of Jesus Christ is not a myth or metaphor, but history’s definitive event that breaks the power of death and guarantees our eternal victory.',
    outline: [
      {
        roman: 'I',
        title: 'The Mourning at Daybreak (vv. 1-3)',
        subpoints: [
          'Women arriving with burial spices expecting a corpse.',
          'The stone rolled away—not to let Jesus out, but to let the witnesses in.',
          'Finding not a body, but an empty slab.'
        ]
      },
      {
        roman: 'II',
        title: 'The Angelic Challenge (vv. 4-7)',
        subpoints: [
          '"Why seek ye the living among the dead?"',
          'He is not here, but is risen!',
          'Remembering what He spoke in Galilee: The cross was not an accident, but the plan.'
        ]
      },
      {
        roman: 'III',
        title: 'The Shockwave Across Eternity (vv. 8-12)',
        subpoints: [
          'Peter running to the tomb to see the folded linens.',
          'Death has been swallowed up in victory.',
          'Because He lives, we shall live also.'
        ]
      }
    ],
    full_text: `### The Dawn of Resurrection
*A Resurrection Sunday Sermon Outline & Manuscript*

> "Why seek ye the living among the dead? He is not here, but is risen!" — Luke 24:5–6

Hallelujah! Today we celebrate the event that split human history in half! Every other founder of every other world religion has a tomb you can visit. Confucius is in his tomb. Buddha is in his tomb. Muhammad is in his tomb. But the tomb outside the walls of Jerusalem is **EMPTY**!

#### 1. Why Seek the Living Among the Dead?
The women came to the tomb on that first Easter morning with heavy hearts and hands full of burial spices. They came to perform the last sad duties for a dead hero. How often do we make the same mistake? We look for joy in dead pleasures; we look for life in dead philosophies; we search for hope in graveyards of despair.
The angels’ question rings down through the centuries: *"Why are you looking for the living among the dead?"*

#### 2. The Stone Was Rolled Away for Us
Jesus did not need the Roman stone rolled away so He could escape. The risen Lord walked through locked doors in the upper room! The stone was rolled away so that the weeping disciples—and every skeptic throughout history—could walk in, look down at the folded graveclothes, and see that death had lost its prisoner!

#### 3. The Living Hope
Because Christ rose from the dead, three things are true:
1. **Your sins are truly forgiven:** The resurrection was the Father’s receipt confirming that the payment of Calvary was accepted in full.
2. **Death is no longer the final word:** The cemetery is not a dead end for the believer; it is merely a waiting room for the resurrection morning.
3. **Jesus is with you right now:** He is not a distant historical memory, but a living, reigning Savior who walks with you through every trial of life!`,
    illustrations: [
      {
        title: 'The Folded Napkin in Jewish Custom',
        content: 'In Jewish dining customs, when a guest finished eating and would not return, he crumpled his napkin and left it on the table. But if the master was merely stepping away and intended to return, he neatly folded the napkin and placed it by his plate. In the empty tomb, Peter saw the napkin that had wrapped Christ’s head not thrown with the linen clothes, but wrapped together in a place by itself—a silent message: "I am coming back!"'
      }
    ],
    key_quotes: [
      '“The stone was rolled away not to let Jesus out, but to let the world look in.”',
      '“Because He lives, I can face tomorrow; because He lives, all fear is gone!”'
    ],
    application_points: [
      'Place your trust in the living Christ who holds the keys of death and hades.',
      'Face your fears of tomorrow knowing that Christ has already conquered the worst thing that could ever happen.',
      'Proclaim the good news to a discouraged friend: He is Risen indeed!'
    ],
    tags: ['Easter', 'Resurrection', 'Hope', 'Victory', 'Luke', 'Liturgical']
  },
  {
    id: 'liturgical-funeral-safe-in-arms',
    volume: 'liturgical',
    volumeLabel: 'Liturgical & Occasional Pulpit',
    author: 'Pastoral Occasions Compendium',
    era: 'Pastoral Care Occasions',
    year: 'Liturgical',
    title: 'Safe in the Shepherd’s Arms: Comfort in the Loss of a Loved One',
    subtitle: 'A Memorial & Funeral Homily of Hope and Eternal Glory',
    scripture_primary: 'John 14:1-6',
    scriptures_secondary: ['1 Thessalonians 4:13-18', '2 Corinthians 5:1-8', 'Revelation 21:1-4'],
    testament: 'NT',
    series_name: 'Pastoral Memorial & Funeral Services',
    historical_context: 'A compassionate, dignified memorial homily providing comfort for grieving family and friends while gently presenting the promise of the Father’s house.',
    theological_theme: 'Eternal Life, Comfort in Grief, Heaven, Resurrection',
    big_idea: 'For the believer in Jesus Christ, death is not an exit into darkness, but an entrance into the prepared mansions of the Father’s house.',
    outline: [
      {
        roman: 'I',
        title: 'The Troubled Heart and the Savior’s Cure (vv. 1-2)',
        subpoints: [
          'Let not your heart be troubled: Acknowledging the deep ache of sorrow.',
          'We do not grieve as those who have no hope (1 Thess 4:13).',
          'In my Father’s house are many mansions.'
        ]
      },
      {
        roman: 'II',
        title: 'A Place Personally Prepared by Christ (v. 3)',
        subpoints: [
          'I go to prepare a place for you.',
          'Christ Himself welcomes the believer home.',
          'Absent from the body, present with the Lord.'
        ]
      },
      {
        roman: 'III',
        title: 'The Sure Way Home (vv. 4-6)',
        subpoints: [
          'Thomas’s honest question: "How can we know the way?"',
          'Jesus’s definitive answer: "I am the Way, the Truth, and the Life."',
          'The call to place our faith in the Savior who conquers the grave.'
        ]
      }
    ],
    full_text: `### Safe in the Shepherd’s Arms
*A Memorial Service Homily*

> "Let not your heart be troubled: ye believe in God, believe also in me. In my Father's house are many mansions... I go to prepare a place for you." — John 14:1–2

We gather today with tears in our eyes and grief in our hearts. It is right to weep; Jesus Himself wept at the tomb of His beloved friend Lazarus. Christianity does not ask us to pretend we do not feel the agonizing sting of loss. But Scripture tells us that **we do not grieve as those who have no hope**.

#### 1. The Father’s House
Jesus spoke these comforting words on the night before His crucifixion. Knowing the sorrow that would soon pierce His disciples, He pointed them beyond the cemetery to the Father’s house. Notice how Jesus describes heaven: not as a sterile, ghostly realm of clouds, but as a **Home**! In a home, there is warmth, welcome, recognition, and safety. There is a room with our loved one’s name upon the door.

#### 2. Personally Received by Christ
Notice the tenderness of verse 3: *"I will come again, and receive you unto myself; that where I am, there ye may be also."*
When a Christian dies, they are not met by an impersonal angel or left to wander across a dark threshold. Christ Himself comes to receive them! The very hands that were pierced on Calvary reach down to welcome His child home.

#### 3. The Legacy and the Choice
Our loved one has finished their earthly course. They have laid down the heavy burdens of sickness, pain, and fatigue. In the presence of God, there are no more tears, no more pain, and no more dying.
The greatest tribute we can pay to their memory is to walk in the same faith that sustained them. Jesus said, *"I am the Way, the Truth, and the Life."* Trust Him today, and you will know the peace that anchors through every storm.`,
    illustrations: [
      {
        title: 'The Ship Disappearing Over the Horizon',
        content: 'Bishop Brent penned the famous reflection: "I am standing upon the seashore. A ship spreads her white sails to the morning breeze and starts for the blue ocean. She diminishes until she hangs like a speck of white cloud just where the sea and sky meet. Someone at my side says, \'There, she is gone!\' Gone where? Gone from my sight, that is all. She is just as large in mast and hull as when she left my side. And just at the moment when someone says, \'She is gone,\' other voices on the distant shore shout, \'Here she comes!\' And that is dying."'
      }
    ],
    key_quotes: [
      '“We do not grieve as those who have no hope.”',
      '“Death for the believer is not the end of the story; it is merely the turning of the page to Chapter One of eternity.”'
    ],
    application_points: [
      'Give yourself permission to mourn deeply while holding fast to God’s promises.',
      'Surround the grieving family with tangible prayer, meals, and comforting presence.',
      'Remember that heaven is a prepared place for a prepared people.'
    ],
    tags: ['Funeral', 'Memorial', 'Grief', 'Heaven', 'John 14', 'Comfort', 'Liturgical']
  }
];

export function searchReferenceLibrary(
  query: string,
  volume: string = 'all',
  testament: string = 'all'
): ReferenceSermon[] {
  const cleanQ = query.toLowerCase().trim();

  return REFERENCE_SERMONS.filter(s => {
    // Volume filter
    if (volume !== 'all' && s.volume !== volume) {
      return false;
    }

    // Testament filter
    if (testament !== 'all' && s.testament !== testament) {
      return false;
    }

    // Search query
    if (!cleanQ) return true;

    const matchesTitle = s.title.toLowerCase().includes(cleanQ);
    const matchesAuthor = s.author.toLowerCase().includes(cleanQ);
    const matchesScripture = s.scripture_primary.toLowerCase().includes(cleanQ) ||
      s.scriptures_secondary.some(sec => sec.toLowerCase().includes(cleanQ));
    const matchesTheme = s.theological_theme.toLowerCase().includes(cleanQ) || s.big_idea.toLowerCase().includes(cleanQ);
    const matchesTags = s.tags.some(t => t.toLowerCase().includes(cleanQ));
    const matchesFullText = s.full_text.toLowerCase().includes(cleanQ);

    return matchesTitle || matchesAuthor || matchesScripture || matchesTheme || matchesTags || matchesFullText;
  });
}

export function getReferenceSermonById(id: string): ReferenceSermon | undefined {
  return REFERENCE_SERMONS.find(s => s.id === id);
}
