export const fitherKnowledgeBase = {
  muscleAndAge: {
    title: "Muscle Loss by Age — What Every Woman Should Know",
    keyFact: "Women lose 3–8% of muscle mass per decade after age 30. After 60, this accelerates to 1–2% per year.",
    timeline: [
      {
        age: "Teens (13–19)",
        phase: "Peak Building Phase",
        color: "green",
        muscle: "Muscle mass is actively growing — this is the best window to build a strong foundation.",
        what_happens: "Puberty drives muscle development. Strength training now sets you up for life.",
        action: "Prioritize strength training 2–3x/week. Build the base now — it pays dividends for decades.",
        icon: "🌱",
        life_stage_key: "teen"
      },
      {
        age: "20s",
        phase: "Peak Muscle Mass",
        color: "green",
        muscle: "Peak muscle mass is reached around age 25–30. This is your physical prime.",
        what_happens: "Estrogen supports muscle repair and bone density. Recovery is fastest at this stage.",
        action: "Lift heavy, eat enough protein (1.6–2.2g/kg/day), and build habits that last. Don't skip resistance training.",
        icon: "💪",
        life_stage_key: "reproductive_age"
      },
      {
        age: "30s",
        phase: "Gradual Decline Begins",
        color: "amber",
        muscle: "Muscle loss begins at ~3–5% per decade. Most women don't notice yet.",
        what_happens: "Slower metabolism, possible pregnancy/postpartum gaps in training, career stress — all contribute.",
        action: "Maintain resistance training at least 3x/week. Prioritize protein at every meal. Don't drop below 1.2g/kg protein/day.",
        icon: "⚡",
        life_stage_key: "reproductive_age"
      },
      {
        age: "40s",
        phase: "Perimenopause Window",
        color: "amber",
        muscle: "Estrogen starts declining. Muscle loss speeds up. Fat redistribution begins (especially belly).",
        what_happens: "Hormonal shifts reduce muscle protein synthesis. Bone density also begins declining.",
        action: "This is the most important decade to strength train. Increase protein to 1.2–1.5g/kg/day. Add weight-bearing exercise for bones.",
        icon: "🔥",
        life_stage_key: "perimenopause"
      },
      {
        age: "50s",
        phase: "Menopause Transition",
        color: "coral",
        muscle: "Muscle strength declines 1.5% per year (50–60). Sarcopenia risk increases significantly.",
        what_happens: "Estrogen drop accelerates both muscle and bone loss. Being postmenopausal triples sarcopenia risk.",
        action: "Minimum 1.2g/kg protein/day — many women eat only 40–50g total which is far too low. Resistance training is non-negotiable.",
        icon: "⚠️",
        life_stage_key: "menopause"
      },
      {
        age: "60s+",
        phase: "Active Prevention Mode",
        color: "red",
        muscle: "Muscle mass declines 0.7–1% per year. Sarcopenia affects 5–13% of women aged 60–70, rising to 31% by age 80.",
        what_happens: "Falls, fractures, reduced independence all linked to muscle loss. Quality of life directly impacted.",
        action: "Protein 1.2–1.5g/kg/day. Resistance + balance training every week. Vitamin D and calcium are essential. Even small amounts of exercise make a huge difference.",
        icon: "🛡️",
        life_stage_key: "postmenopause"
      }
    ]
  },

  proteinByLifePhase: {
    title: "Protein Guide for Every Phase of a Woman's Life",
    subtitle: "Based on research from Mayo Clinic, Harvard Health, NIH, and Examine.com",
    phases: [
      {
        phase: "Teenager (13–18)",
        icon: "🌸",
        color: "purple",
        daily_grams: "46–75g/day",
        per_kg: "1.0–1.7g/kg",
        why: "Critical for growth, bone density formation, and muscle development. Athletic teens need the higher end of the range.",
        indian_sources: [
          "Moong dal (1 cup cooked = 14g protein)",
          "Paneer (100g = 18g protein)",
          "Eggs (1 egg = 6g protein)",
          "Greek yogurt / dahi (1 cup = 17g protein)",
          "Rajma (1 cup cooked = 15g protein)"
        ],
        warning: "Teenage girls often under-eat protein due to diet culture. This directly harms bone and muscle development.",
        life_stage_key: "teen"
      },
      {
        phase: "20s — Active & Building",
        icon: "💫",
        color: "teal",
        daily_grams: "60–110g/day",
        per_kg: "1.6–2.2g/kg (active) / 0.8–1.0g/kg (sedentary)",
        why: "Peak muscle-building window. Higher intake supports muscle growth, metabolism, satiety, and mood.",
        indian_sources: [
          "Chicken breast (100g = 31g protein)",
          "Dal + rice combination (complete amino acids)",
          "Soya chunks (100g dry = 52g protein)",
          "Tofu (100g = 8–15g protein)",
          "Curd/dahi + fruit bowl (easy breakfast)"
        ],
        warning: "Most women in their 20s skip protein at breakfast. Aim for 25–30g of protein at your first meal.",
        life_stage_key: "reproductive_age"
      },
      {
        phase: "30s — Stress & Maintenance",
        icon: "⚡",
        color: "amber",
        daily_grams: "75–100g/day",
        per_kg: "1.2–1.6g/kg",
        why: "Muscle loss begins silently. Higher protein preserves lean mass during calorie restriction and busy lifestyles.",
        indian_sources: [
          "Sprouts salad (1 cup = 8–10g protein)",
          "Palak paneer (good iron + protein combo)",
          "Fish curry (100g fish = 22–25g protein)",
          "Chana dal (1 cup cooked = 13g protein)",
          "Sattu drink (30g sattu = 10g protein — great for Indian women)"
        ],
        warning: "Weight loss diets in your 30s often cut protein too low. Minimum 1.2g/kg even in a calorie deficit.",
        life_stage_key: "reproductive_age"
      },
      {
        phase: "Pregnancy",
        icon: "🤱",
        color: "pink",
        daily_grams: "75–100g/day (1st trimester) → up to 110g/day (3rd trimester)",
        per_kg: "1.5–1.8g/kg — increases each trimester",
        why: "Protein builds fetal tissue, placenta, blood supply, and expanding uterine tissue. 3rd trimester needs are highest.",
        indian_sources: [
          "Dahi + banana smoothie (easy morning protein)",
          "Moong dal khichdi (gentle on digestion)",
          "Paneer paratha (protein + calcium)",
          "Ragi (finger millet) ladoo (calcium + protein)",
          "Til (sesame) chutney (calcium-rich)"
        ],
        warning: "Do NOT restrict calories or protein during pregnancy for weight management — it directly affects fetal development. Always consult your OB-GYN.",
        life_stage_key: "pregnancy"
      },
      {
        phase: "Postpartum & Breastfeeding",
        icon: "🌺",
        color: "coral",
        daily_grams: "90–115g/day",
        per_kg: "1.7g/kg — breastfeeding adds 15–20g extra daily need",
        why: "Milk production, recovery from birth, tissue repair, and preventing postpartum hair loss all demand extra protein.",
        indian_sources: [
          "Gondh (edible gum) ladoo — traditional postpartum food",
          "Methi seeds in dal (iron + protein for recovery)",
          "Doodh + badam (milk + almonds — calcium + protein)",
          "Ajwain paratha with dahi (traditional recovery meal)",
          "Saag with paneer (iron + protein + folate)"
        ],
        warning: "Postpartum women often skip meals while caring for baby. Protein deficiency worsens fatigue, hair loss, and mood. Prepare protein snacks in advance.",
        life_stage_key: "postpartum"
      },
      {
        phase: "Perimenopause (40s–early 50s)",
        icon: "🔥",
        color: "orange",
        daily_grams: "80–100g/day",
        per_kg: "1.2–1.5g/kg",
        why: "Estrogen decline reduces muscle protein synthesis efficiency. Higher protein intake partially compensates for hormonal losses.",
        indian_sources: [
          "Soya-based curries (phytoestrogens help with symptoms)",
          "Flaxseed chutney (omega-3 + lignans for hormone balance)",
          "Beans and legumes dal (affordable, complete when paired with rice)",
          "Low-fat paneer tikka",
          "Nachni (ragi) dosa (calcium-rich, bone protective)"
        ],
        warning: "Belly fat increases even without weight gain during this phase. Strength training + high protein is the most evidence-backed approach to managing body composition changes.",
        life_stage_key: "perimenopause"
      },
      {
        phase: "Menopause & Beyond (50s+)",
        icon: "🛡️",
        color: "blue",
        daily_grams: "80–96g/day minimum",
        per_kg: "1.2g/kg (sedentary) → 1.5g/kg (active)",
        why: "Preventing sarcopenia is the #1 priority. Most women this age eat only 40–50g/day — far below what's needed. Pair with resistance training for best results.",
        indian_sources: [
          "Til (sesame) chikki — calcium powerhouse",
          "Sabut moong dal — easy to digest, high protein",
          "Curd rice with curry leaves (gut health + protein)",
          "Amaranth (rajgira) khichdi — complete amino acids",
          "Fish (especially rahu, rohu) — omega-3 + protein for joints"
        ],
        warning: "Women over 65 with low bone density may need up to 1.3g/kg protein to reduce fracture risk. Pair with Vitamin D and calcium. Consult your doctor.",
        life_stage_key: "postmenopause"
      }
    ]
  },

  quickFacts: [
    {
      fact: "Muscle loss starts at 30",
      detail: "Women lose 3–8% muscle per decade from age 30 onward",
      source: "Office on Women's Health, US"
    },
    {
      fact: "Menopause triples sarcopenia risk",
      detail: "Being postmenopausal is associated with 3x higher odds of sarcopenia",
      source: "PMC / NIH Research"
    },
    {
      fact: "Most women eat half the protein they need",
      detail: "Average intake is 40–50g/day vs the 80–100g recommended",
      source: "Mayo Clinic"
    },
    {
      fact: "Strength training reverses muscle loss",
      detail: "Progressive resistance training is the #1 evidence-backed treatment for sarcopenia",
      source: "PMC Sarcopenia Review"
    },
    {
      fact: "Protein timing matters",
      detail: "Aim for 25–30g at breakfast. Most women eat the majority at dinner — this is suboptimal",
      source: "Mayo Clinic"
    },
    {
      fact: "Pregnancy protein needs climb each trimester",
      detail: "From ~1.5g/kg in 1st trimester to ~1.8g/kg by 3rd trimester",
      source: "Examine.com / NIH"
    }
  ]
};
