/* V1.18 compatibility seed. Expanded database referenceCollections take precedence.
 * Reference values are not retrieved label evidence. */
window.AMU_FEATURE_DEFAULTS = {
  "references": {
    "drugGroups": [
      {
        "groupName": "Fluoroquinolones",
        "aliases": [
          "fluoroquinolones",
          "fluoroquinolone",
          "quinolones",
          "quinolone",
          "fluroquinolones"
        ],
        "members": [
          "Ciprofloxacin",
          "Levofloxacin",
          "Moxifloxacin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Pyelonephritis",
          "Complicated / Uncomplicated UTI",
          "Acute Bacterial Prostatitis",
          "Pseudomonas aeruginosa",
          "Osteomyelitis (Acute / Chronic)",
          "Intra-Abdominal Infection / Peritonitis"
        ]
      },
      {
        "groupName": "Carbapenems",
        "aliases": [
          "carbapenems",
          "carbapenem"
        ],
        "members": [
          "Meropenem",
          "Ertapenem",
          "Imipenem and Cilastatin"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Febrile Neutropenia",
          "Intra-Abdominal Infection / Peritonitis",
          "Bacterial Meningitis",
          "Acute Pyelonephritis",
          "Klebsiella pneumoniae",
          "Pseudomonas aeruginosa"
        ]
      },
      {
        "groupName": "Cephalosporins",
        "aliases": [
          "cephalosporins",
          "cephalosporin"
        ],
        "members": [
          "Cefazolin",
          "Ceftriaxone",
          "Cefotaxime",
          "Ceftazidime",
          "Cefepime",
          "Ceftaroline"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Bacterial Meningitis",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Acute Pyelonephritis",
          "Febrile Neutropenia",
          "Gonorrhea"
        ]
      },
      {
        "groupName": "Penicillins / Beta-Lactams",
        "aliases": [
          "penicillins",
          "aminopenicillins",
          "antipseudomonal penicillins",
          "beta-lactams",
          "beta lactams"
        ],
        "members": [
          "Amoxicillin",
          "Ampicillin",
          "Piperacillin",
          "Penicillin V",
          "Penicillin G",
          "Cloxacillin",
          "Oxacillin",
          "Nafcillin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Streptococcal Pharyngitis",
          "Staphylococcus aureus",
          "Syphilis",
          "Nosocomial / Ventilator Pneumonia",
          "Infective Endocarditis"
        ]
      },
      {
        "groupName": "Macrolides",
        "aliases": [
          "macrolides",
          "macrolide"
        ],
        "members": [
          "Azithromycin",
          "Clarithromycin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Chlamydia trachomatis",
          "Streptococcal Pharyngitis",
          "Helicobacter pylori",
          "Acute COPD Exacerbation"
        ]
      },
      {
        "groupName": "Tetracyclines",
        "aliases": [
          "tetracyclines",
          "tetracycline class"
        ],
        "members": [
          "Doxycycline",
          "Minocycline",
          "Tigecycline"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Chlamydia trachomatis",
          "Cellulitis & Skin Structure",
          "Borrelia burgdorferi"
        ]
      },
      {
        "groupName": "Aminoglycosides",
        "aliases": [
          "aminoglycosides",
          "aminoglycoside"
        ],
        "members": [
          "Gentamicin",
          "Amikacin",
          "Tobramycin"
        ],
        "mainInfections": [
          "Acute Pyelonephritis",
          "Pseudomonas aeruginosa",
          "Infective Endocarditis",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "groupName": "Glycopeptides & Lipopeptides",
        "aliases": [
          "glycopeptides",
          "glycopeptide",
          "lipopeptides"
        ],
        "members": [
          "Vancomycin",
          "Daptomycin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Clostridioides difficile Colitis",
          "Infective Endocarditis",
          "Osteomyelitis (Acute / Chronic)",
          "Bacterial Meningitis",
          "Enterococcus faecium"
        ]
      },
      {
        "groupName": "Echinocandins & Systemic Antifungals",
        "aliases": [
          "echinocandins",
          "echinocandin",
          "antifungals",
          "azoles"
        ],
        "members": [
          "Anidulafungin",
          "Caspofungin",
          "Fluconazole",
          "Voriconazole",
          "Amphotericin B"
        ],
        "mainInfections": [
          "Invasive Candidiasis",
          "Invasive Aspergillosis",
          "Febrile Neutropenia"
        ]
      }
    ],
    "drugCatalog": [
      {
        "name": "Amoxicillin",
        "aliases": [
          "amoxicillin",
          "amoxycillin",
          "amoxil"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Otitis Media",
          "Acute Bacterial Sinusitis",
          "Streptococcal Pharyngitis",
          "Helicobacter pylori",
          "Complicated / Uncomplicated UTI"
        ]
      },
      {
        "name": "Amoxicillin and Clavulanate",
        "aliases": [
          "amoxicillin-clavulanate",
          "amoxicillin clavulanate",
          "amoxicillin clavulanic acid",
          "augmentin",
          "co-amoxiclav",
          "coamoxiclav"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Otitis Media",
          "Acute Bacterial Sinusitis",
          "Cellulitis & Skin Structure"
        ]
      },
      {
        "name": "Ampicillin and Sulbactam",
        "aliases": [
          "ampicillin-sulbactam",
          "ampicillin sulbactam",
          "unasyn"
        ],
        "mainInfections": [
          "Intra-Abdominal Infection / Peritonitis",
          "Cellulitis & Skin Structure"
        ]
      },
      {
        "name": "Ampicillin",
        "aliases": [
          "ampicillin",
          "ampicilin"
        ],
        "mainInfections": [
          "Infective Endocarditis",
          "Bacterial Meningitis",
          "Intra-Abdominal Infection / Peritonitis",
          "Listeria monocytogenes"
        ]
      },
      {
        "name": "Piperacillin",
        "aliases": [
          "piperacillin"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Febrile Neutropenia",
          "Intra-Abdominal Infection / Peritonitis",
          "Pseudomonas aeruginosa",
          "Diabetic Foot Infection",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Piperacillin and Tazobactam",
        "aliases": [
          "piperacillin-tazobactam",
          "piperacillin tazobactam",
          "zosyn",
          "tazocin",
          "pip tazo"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Febrile Neutropenia",
          "Intra-Abdominal Infection / Peritonitis",
          "Pseudomonas aeruginosa",
          "Diabetic Foot Infection",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Penicillin V",
        "aliases": [
          "penicillin v",
          "phenoxymethylpenicillin",
          "penicillin vk",
          "pen vk"
        ],
        "mainInfections": [
          "Streptococcal Pharyngitis",
          "Streptococcus pyogenes"
        ]
      },
      {
        "name": "Penicillin G",
        "aliases": [
          "penicillin",
          "penicillin g",
          "benzylpenicillin"
        ],
        "mainInfections": [
          "Syphilis",
          "Neurosyphilis",
          "Streptococcal Pharyngitis",
          "Streptococcus pyogenes",
          "Infective Endocarditis"
        ]
      },
      {
        "name": "Cloxacillin",
        "aliases": [
          "cloxacillin",
          "cloxacillin benzathine"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Infective Endocarditis"
        ]
      },
      {
        "name": "Oxacillin",
        "aliases": [
          "oxacillin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Infective Endocarditis"
        ]
      },
      {
        "name": "Nafcillin",
        "aliases": [
          "nafcillin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Infective Endocarditis"
        ]
      },
      {
        "name": "Dicloxacillin",
        "aliases": [
          "dicloxacillin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Cellulitis & Skin Structure"
        ]
      },
      {
        "name": "Cefazolin",
        "aliases": [
          "cefazolin",
          "ancef",
          "kefzol",
          "cephazolin"
        ],
        "mainInfections": [
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Septic Arthritis",
          "Staphylococcus aureus",
          "Infective Endocarditis"
        ]
      },
      {
        "name": "Ceftriaxone",
        "aliases": [
          "ceftriaxone",
          "rocephin",
          "ceftriaxon"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Bacterial Meningitis",
          "Acute Pyelonephritis",
          "Gonorrhea",
          "Infective Endocarditis",
          "Intra-Abdominal Infection / Peritonitis"
        ]
      },
      {
        "name": "Cefotaxime",
        "aliases": [
          "cefotaxime",
          "claforan"
        ],
        "mainInfections": [
          "Bacterial Meningitis",
          "Intra-Abdominal Infection / Peritonitis",
          "Community-Acquired Pneumonia",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Ceftazidime",
        "aliases": [
          "ceftazidime",
          "fortaz",
          "tazicef"
        ],
        "mainInfections": [
          "Pseudomonas aeruginosa",
          "Nosocomial / Ventilator Pneumonia",
          "Febrile Neutropenia",
          "Complicated / Uncomplicated UTI"
        ]
      },
      {
        "name": "Cefepime",
        "aliases": [
          "cefepime",
          "maxipime",
          "cefipime"
        ],
        "mainInfections": [
          "Febrile Neutropenia",
          "Nosocomial / Ventilator Pneumonia",
          "Pseudomonas aeruginosa",
          "Complicated / Uncomplicated UTI",
          "Intra-Abdominal Infection / Peritonitis"
        ]
      },
      {
        "name": "Ceftaroline",
        "aliases": [
          "ceftaroline",
          "teflaro"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Cellulitis & Skin Structure",
          "Community-Acquired Pneumonia"
        ]
      },
      {
        "name": "Cefuroxime",
        "aliases": [
          "cefuroxime",
          "zinacef",
          "ceftin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Bacterial Sinusitis",
          "Acute Otitis Media",
          "Complicated / Uncomplicated UTI"
        ]
      },
      {
        "name": "Cefoxitin",
        "aliases": [
          "cefoxitin",
          "mefoxin"
        ],
        "mainInfections": [
          "Intra-Abdominal Infection / Peritonitis",
          "Pelvic Inflammatory Disease",
          "Diabetic Foot Infection"
        ]
      },
      {
        "name": "Cefiderocol",
        "aliases": [
          "cefiderocol",
          "fetroja"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Complicated / Uncomplicated UTI",
          "Pseudomonas aeruginosa",
          "Klebsiella pneumoniae"
        ]
      },
      {
        "name": "Meropenem",
        "aliases": [
          "meropenem",
          "merrem",
          "meropenim"
        ],
        "mainInfections": [
          "Bacterial Meningitis",
          "Febrile Neutropenia",
          "Intra-Abdominal Infection / Peritonitis",
          "Nosocomial / Ventilator Pneumonia",
          "Klebsiella pneumoniae",
          "Pseudomonas aeruginosa",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Ertapenem",
        "aliases": [
          "ertapenem",
          "invanz"
        ],
        "mainInfections": [
          "Acute Pyelonephritis",
          "Complicated / Uncomplicated UTI",
          "Intra-Abdominal Infection / Peritonitis",
          "Community-Acquired Pneumonia",
          "Diabetic Foot Infection"
        ]
      },
      {
        "name": "Imipenem and Cilastatin",
        "aliases": [
          "imipenem",
          "imipenem-cilastatin",
          "imipenem cilastatin",
          "primaxin",
          "tienam"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Intra-Abdominal Infection / Peritonitis",
          "Pseudomonas aeruginosa",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Aztreonam",
        "aliases": [
          "aztreonam",
          "azactam"
        ],
        "mainInfections": [
          "Pseudomonas aeruginosa",
          "Acute Pyelonephritis",
          "Nosocomial / Ventilator Pneumonia",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Vancomycin",
        "aliases": [
          "vancomycin",
          "vancocin",
          "vankomycin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Clostridioides difficile Colitis",
          "Bacterial Meningitis",
          "Infective Endocarditis",
          "Osteomyelitis (Acute / Chronic)",
          "Bacteremia / Septicemia",
          "Febrile Neutropenia"
        ]
      },
      {
        "name": "Daptomycin",
        "aliases": [
          "daptomycin",
          "cubicin",
          "daptomicin"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Infective Endocarditis",
          "Bacteremia / Septicemia",
          "Osteomyelitis (Acute / Chronic)",
          "Enterococcus faecium"
        ]
      },
      {
        "name": "Linezolid",
        "aliases": [
          "linezolid",
          "zyvox",
          "linezolide"
        ],
        "mainInfections": [
          "Staphylococcus aureus",
          "Enterococcus faecium",
          "Nosocomial / Ventilator Pneumonia",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)"
        ]
      },
      {
        "name": "Doxycycline",
        "aliases": [
          "doxycycline",
          "vibramycin",
          "doxycyclin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Chlamydia trachomatis",
          "Cellulitis & Skin Structure",
          "Borrelia burgdorferi"
        ]
      },
      {
        "name": "Minocycline",
        "aliases": [
          "minocycline",
          "minocin"
        ],
        "mainInfections": [
          "Cellulitis & Skin Structure"
        ]
      },
      {
        "name": "Tigecycline",
        "aliases": [
          "tigecycline",
          "tygacil"
        ],
        "mainInfections": [
          "Intra-Abdominal Infection / Peritonitis",
          "Cellulitis & Skin Structure",
          "Community-Acquired Pneumonia"
        ]
      },
      {
        "name": "Azithromycin",
        "aliases": [
          "azithromycin",
          "zithromax",
          "azithromicin"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Chlamydia trachomatis",
          "Gonorrhea",
          "Streptococcal Pharyngitis"
        ]
      },
      {
        "name": "Clarithromycin",
        "aliases": [
          "clarithromycin",
          "biaxin",
          "klacid"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Helicobacter pylori",
          "Acute Bacterial Sinusitis"
        ]
      },
      {
        "name": "Ciprofloxacin",
        "aliases": [
          "ciprofloxacin",
          "cipro",
          "ciprofloxacine"
        ],
        "mainInfections": [
          "Acute Pyelonephritis",
          "Complicated / Uncomplicated UTI",
          "Acute Bacterial Prostatitis",
          "Pseudomonas aeruginosa",
          "Osteomyelitis (Acute / Chronic)",
          "Intra-Abdominal Infection / Peritonitis"
        ]
      },
      {
        "name": "Levofloxacin",
        "aliases": [
          "levofloxacin",
          "levaquin",
          "tavanic"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Nosocomial / Ventilator Pneumonia",
          "Acute Pyelonephritis",
          "Acute Bacterial Prostatitis",
          "Acute Bacterial Sinusitis"
        ]
      },
      {
        "name": "Moxifloxacin",
        "aliases": [
          "moxifloxacin",
          "avelox"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Intra-Abdominal Infection / Peritonitis",
          "Acute Bacterial Sinusitis"
        ]
      },
      {
        "name": "Gatifloxacin",
        "aliases": [
          "gatifloxacin",
          "tequin",
          "zymar"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Bacterial Sinusitis"
        ]
      },
      {
        "name": "Gentamicin",
        "aliases": [
          "gentamicin",
          "garamycin",
          "gentamycin"
        ],
        "mainInfections": [
          "Acute Pyelonephritis",
          "Infective Endocarditis",
          "Pelvic Inflammatory Disease",
          "Bacteremia / Septicemia"
        ]
      },
      {
        "name": "Amikacin",
        "aliases": [
          "amikacin",
          "amikin"
        ],
        "mainInfections": [
          "Nosocomial / Ventilator Pneumonia",
          "Pseudomonas aeruginosa",
          "Klebsiella pneumoniae",
          "Complicated / Uncomplicated UTI"
        ]
      },
      {
        "name": "Tobramycin",
        "aliases": [
          "tobramycin",
          "nebcin"
        ],
        "mainInfections": [
          "Pseudomonas aeruginosa",
          "Nosocomial / Ventilator Pneumonia",
          "Complicated / Uncomplicated UTI",
          "Bacterial Meningitis"
        ]
      },
      {
        "name": "Plazomicin",
        "aliases": [
          "plazomicin",
          "zemdri"
        ],
        "mainInfections": [
          "Acute Pyelonephritis",
          "Complicated / Uncomplicated UTI",
          "Klebsiella pneumoniae"
        ]
      },
      {
        "name": "Clindamycin",
        "aliases": [
          "clindamycin",
          "cleocin",
          "dalacin"
        ],
        "mainInfections": [
          "Cellulitis & Skin Structure",
          "Streptococcus pyogenes",
          "Brain Abscess",
          "Pelvic Inflammatory Disease",
          "Osteomyelitis (Acute / Chronic)"
        ]
      },
      {
        "name": "Metronidazole",
        "aliases": [
          "metronidazole",
          "flagyl"
        ],
        "mainInfections": [
          "Intra-Abdominal Infection / Peritonitis",
          "Clostridioides difficile Colitis",
          "Brain Abscess",
          "Pelvic Inflammatory Disease"
        ]
      },
      {
        "name": "Sulfamethoxazole and Trimethoprim",
        "aliases": [
          "sulfamethoxazole-trimethoprim",
          "trimethoprim-sulfamethoxazole",
          "sulfamethoxazole trimethoprim",
          "trimethoprim sulfamethoxazole",
          "tmp-smx",
          "tmp smx",
          "bactrim",
          "septra",
          "cotrimoxazole",
          "co-trimoxazole"
        ],
        "mainInfections": [
          "Complicated / Uncomplicated UTI",
          "Acute Pyelonephritis",
          "Staphylococcus aureus"
        ]
      },
      {
        "name": "Trimethoprim",
        "aliases": [
          "trimethoprim",
          "primsol"
        ],
        "mainInfections": [
          "Complicated / Uncomplicated UTI"
        ]
      },
      {
        "name": "Sulfamethoxazole",
        "aliases": [
          "sulfamethoxazole"
        ],
        "mainInfections": []
      },
      {
        "name": "Pivmecillinam",
        "aliases": [
          "pivmecillinam",
          "pivya",
          "selexid"
        ],
        "mainInfections": [
          "Complicated / Uncomplicated UTI",
          "Escherichia coli"
        ]
      },
      {
        "name": "Nitrofurantoin",
        "aliases": [
          "nitrofurantoin",
          "macrobid",
          "macrodantin"
        ],
        "mainInfections": [
          "Complicated / Uncomplicated UTI",
          "Escherichia coli"
        ]
      },
      {
        "name": "Fosfomycin",
        "aliases": [
          "fosfomycin",
          "monurol"
        ],
        "mainInfections": [
          "Complicated / Uncomplicated UTI",
          "Escherichia coli"
        ]
      },
      {
        "name": "Rifampin",
        "aliases": [
          "rifampin",
          "rifampicin",
          "rifadin"
        ],
        "mainInfections": [
          "Pulmonary Tuberculosis",
          "Infective Endocarditis",
          "Osteomyelitis (Acute / Chronic)"
        ]
      },
      {
        "name": "Isoniazid",
        "aliases": [
          "isoniazid",
          "inh"
        ],
        "mainInfections": [
          "Pulmonary Tuberculosis"
        ]
      },
      {
        "name": "Pyrazinamide",
        "aliases": [
          "pyrazinamide",
          "pza"
        ],
        "mainInfections": [
          "Pulmonary Tuberculosis"
        ]
      },
      {
        "name": "Ethambutol",
        "aliases": [
          "ethambutol",
          "emb"
        ],
        "mainInfections": [
          "Pulmonary Tuberculosis"
        ]
      },
      {
        "name": "Colistin",
        "aliases": [
          "colistin",
          "colistimethate",
          "polymyxin e"
        ],
        "mainInfections": [
          "Pseudomonas aeruginosa",
          "Klebsiella pneumoniae"
        ]
      },
      {
        "name": "Fluconazole",
        "aliases": [
          "fluconazole",
          "diflucan"
        ],
        "mainInfections": [
          "Invasive Candidiasis"
        ]
      },
      {
        "name": "Voriconazole",
        "aliases": [
          "voriconazole",
          "vfend"
        ],
        "mainInfections": [
          "Invasive Aspergillosis",
          "Invasive Candidiasis"
        ]
      },
      {
        "name": "Anidulafungin",
        "aliases": [
          "anidulafungin",
          "eraxis"
        ],
        "mainInfections": [
          "Invasive Candidiasis"
        ]
      },
      {
        "name": "Caspofungin",
        "aliases": [
          "caspofungin",
          "cancidas"
        ],
        "mainInfections": [
          "Invasive Candidiasis",
          "Invasive Aspergillosis",
          "Febrile Neutropenia"
        ]
      },
      {
        "name": "Amphotericin B",
        "aliases": [
          "amphotericin b",
          "ambisome",
          "fungizone",
          "amphotericin"
        ],
        "mainInfections": [
          "Invasive Candidiasis",
          "Invasive Aspergillosis"
        ]
      },
      {
        "name": "Cephalexin",
        "aliases": [
          "cephalexin",
          "cefalexin"
        ],
        "mainInfections": [
          "Acute Otitis Media",
          "Cellulitis & Skin Structure",
          "Osteomyelitis (Acute / Chronic)",
          "Genitourinary Tract Infections"
        ]
      },
      {
        "name": "Ampicillin and sulbactam",
        "aliases": [
          "ampicillin and sulbactam",
          "ampicillin-sulbactam",
          "ampicillin/sulbactam",
          "ampicillin sulbactam",
          "unasyn"
        ],
        "mainInfections": [
          "Cellulitis & Skin Structure",
          "Intra-Abdominal Infection / Peritonitis",
          "Gynecological Infections"
        ]
      },
      {
        "name": "Ceftazidime-avibactam",
        "aliases": [
          "ceftazidime-avibactam",
          "ceftazidime/avibactam",
          "ceftazidime avibactam",
          "ceftazidime and avibactam",
          "ceftazidime, avibactam",
          "avycaz"
        ],
        "mainInfections": [
          "Complicated Intra-Abdominal Infections",
          "Complicated Urinary Tract Infections",
          "Acute Pyelonephritis",
          "Nosocomial / Ventilator Pneumonia"
        ]
      },
      {
        "name": "Ceftolozane and tazobactam",
        "aliases": [
          "ceftolozane and tazobactam",
          "ceftolozane-tazobactam",
          "ceftolozane/tazobactam",
          "ceftolozane tazobactam",
          "zerbaxa"
        ],
        "mainInfections": [
          "Complicated Intra-Abdominal Infections",
          "Complicated Urinary Tract Infections",
          "Acute Pyelonephritis",
          "Nosocomial / Ventilator Pneumonia"
        ]
      },
      {
        "name": "Meropenem-vaborbactam",
        "aliases": [
          "meropenem-vaborbactam",
          "meropenem/vaborbactam",
          "meropenem vaborbactam",
          "meropenem and vaborbactam",
          "vabomere"
        ],
        "mainInfections": [
          "Complicated Urinary Tract Infections",
          "Acute Pyelonephritis"
        ]
      },
      {
        "name": "Micafungin",
        "aliases": [
          "micafungin"
        ],
        "mainInfections": [
          "Invasive Candidiasis",
          "Esophageal Candidiasis",
          "Prophylaxis of Candida Infections"
        ]
      },
      {
        "name": "Posaconazole",
        "aliases": [
          "posaconazole",
          "noxafil"
        ],
        "mainInfections": [
          "Prophylaxis of Invasive Aspergillus and Candida Infections"
        ]
      },
      {
        "name": "Isavuconazonium",
        "aliases": [
          "isavuconazonium",
          "isavuconazonium sulfate",
          "cresemba"
        ],
        "mainInfections": [
          "Invasive Aspergillosis",
          "Invasive Mucormycosis"
        ]
      },
      {
        "name": "Flucytosine",
        "aliases": [
          "flucytosine"
        ],
        "mainInfections": [
          "Invasive Candidiasis",
          "Cryptococcal Meningitis"
        ]
      },
      {
        "name": "Bedaquiline",
        "aliases": [
          "bedaquiline",
          "bedaquiline fumarate",
          "sirturo"
        ],
        "mainInfections": [
          "Multidrug-resistant Pulmonary Tuberculosis"
        ]
      },
      {
        "name": "Omadacycline",
        "aliases": [
          "omadacycline",
          "nuzyra"
        ],
        "mainInfections": [
          "Community-Acquired Pneumonia",
          "Acute Bacterial Skin and Skin Structure Infections"
        ]
      },
      {
        "name": "Eravacycline",
        "aliases": [
          "eravacycline",
          "xerava"
        ],
        "mainInfections": [
          "Complicated Intra-Abdominal Infections"
        ]
      },
      {
        "name": "Dalbavancin",
        "aliases": [
          "dalbavancin"
        ],
        "mainInfections": [
          "Acute Bacterial Skin and Skin Structure Infections"
        ]
      },
      {
        "name": "Oritavancin",
        "aliases": [
          "oritavancin",
          "oritavancin diphosphate",
          "kimyrsa"
        ],
        "mainInfections": [
          "Acute Bacterial Skin and Skin Structure Infections"
        ]
      },
      {
        "name": "Telavancin",
        "aliases": [
          "telavancin",
          "telavancin hydrochloride",
          "vibativ"
        ],
        "mainInfections": [
          "Complicated Skin and Skin Structure Infections",
          "Nosocomial / Ventilator Pneumonia"
        ]
      }
    ],
    "pathogenProfiles": [
      {
        "canonical": "Staphylococcus aureus",
        "aliases": [
          "staphylococcus aureus",
          "staph aureus",
          "stapholococcus aureus",
          "staphylococcus aureas",
          "mrsa",
          "mssa"
        ],
        "nihTerm": "Staphylococcal Infections",
        "fdaSearch": "staphylococcus aureus",
        "isPathogen": true,
        "curatedDrugs": [
          "Vancomycin",
          "Cefazolin",
          "Cloxacillin",
          "Oxacillin",
          "Nafcillin",
          "Linezolid",
          "Daptomycin",
          "Doxycycline",
          "Clindamycin",
          "Ceftaroline",
          "Sulfamethoxazole and Trimethoprim"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All S. aureus Presentations",
            "keywords": [],
            "note": "Distinguish MSSA (Cefazolin / Anti-staphylococcal penicillins superior to Vancomycin) from MRSA (Vancomycin, Daptomycin, Linezolid, Ceftaroline)."
          },
          {
            "id": "skin",
            "label": "Cellulitis & Purulent Abscess",
            "keywords": [
              "skin",
              "abscess",
              "cellulitis",
              "wound",
              "clindamycin",
              "doxycycline",
              "vancomycin",
              "cefazolin",
              "cloxacillin",
              "oxacillin",
              "linezolid"
            ],
            "note": "Purulent SSTI: Incision & drainage plus TMP-SMX, Doxycycline, Clindamycin (PO), or Vancomycin/Cefazolin/Cloxacillin (IV)."
          },
          {
            "id": "bacteremia",
            "label": "Bacteremia & Endocarditis",
            "keywords": [
              "bacteremia",
              "septicemia",
              "endocarditis",
              "bloodstream",
              "vancomycin",
              "daptomycin",
              "cefazolin",
              "oxacillin",
              "nafcillin"
            ],
            "note": "S. aureus Bacteremia (SAB) / Endocarditis: Mandatory echocardiography and repeat blood cultures. Never use Daptomycin for pneumonia."
          },
          {
            "id": "bone",
            "label": "Osteomyelitis & Septic Arthritis",
            "keywords": [
              "bone",
              "joint",
              "osteomyelitis",
              "arthritis",
              "vancomycin",
              "cefazolin",
              "daptomycin",
              "linezolid",
              "cloxacillin"
            ],
            "note": "Vertebral / Long-Bone Osteomyelitis: Requires 4–6 weeks of parenteral or highly bioavailable oral therapy."
          },
          {
            "id": "pneumonia",
            "label": "Necrotizing / Hospital Pneumonia",
            "keywords": [
              "pneumonia",
              "respiratory",
              "nosocomial",
              "vancomycin",
              "linezolid",
              "ceftaroline"
            ],
            "note": "MRSA HAP/VAP or Post-Influenza Pneumonia: Treat with IV Vancomycin or Linezolid."
          }
        ]
      },
      {
        "canonical": "Escherichia coli",
        "aliases": [
          "escherichia coli",
          "e coli",
          "e. coli",
          "eschericia coli"
        ],
        "nihTerm": "Escherichia coli Infections",
        "fdaSearch": "escherichia coli",
        "isPathogen": true,
        "curatedDrugs": [
          "Ceftriaxone",
          "Cefotaxime",
          "Ciprofloxacin",
          "Nitrofurantoin",
          "Sulfamethoxazole and Trimethoprim",
          "Meropenem",
          "Ertapenem",
          "Piperacillin-tazobactam",
          "Gentamicin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All E. coli Presentations",
            "keywords": [],
            "note": "Predominant facultative Gram-negative rod in urinary, hepatobiliary, and intra-abdominal infections."
          },
          {
            "id": "cystitis",
            "label": "Uncomplicated Cystitis / Lower UTI",
            "keywords": [
              "urinary",
              "cystitis",
              "nitrofurantoin",
              "sulfamethoxazole",
              "ciprofloxacin"
            ],
            "note": "Uncomplicated Cystitis: Nitrofurantoin (5 days), TMP-SMX (3 days), or Fosfomycin."
          },
          {
            "id": "pyelo_sepsis",
            "label": "Pyelonephritis / Urosepsis",
            "keywords": [
              "pyelonephritis",
              "urosepsis",
              "urinary-source sepsis"
            ],
            "note": "Pyelonephritis / urinary-source sepsis: use a systemic agent guided by severity and susceptibility. Nitrofurantoin is not suitable for renal-parenchymal infection."
          },
          {
            "id": "peritonitis",
            "label": "Intra-Abdominal Infection / Peritonitis",
            "keywords": [
              "intra-abdominal infection",
              "peritonitis",
              "abdominal sepsis"
            ],
            "note": "Use systemic enteric Gram-negative coverage; add anaerobic coverage when the syndrome/source requires it. Source control is central."
          },
          {
            "id": "cholangitis",
            "label": "Cholangitis / Biliary Infection",
            "keywords": [
              "cholangitis",
              "biliary infection",
              "biliary sepsis"
            ],
            "note": "Biliary infection: systemic enteric Gram-negative coverage plus source control/biliary drainage when indicated; tailor to cultures."
          },
          {
            "id": "liver_abscess",
            "label": "Pyogenic Liver Abscess",
            "keywords": [
              "pyogenic liver abscess",
              "hepatic abscess",
              "liver abscess"
            ],
            "note": "Drainage/source control and cultures are central; select systemic therapy by likely mixed flora and susceptibility results."
          }
        ]
      },
      {
        "canonical": "Pseudomonas aeruginosa",
        "aliases": [
          "pseudomonas aeruginosa",
          "pseudomonas",
          "pseudomonis aeruginosa",
          "psuedomonas"
        ],
        "nihTerm": "Pseudomonas Infections",
        "fdaSearch": "pseudomonas aeruginosa",
        "isPathogen": true,
        "curatedDrugs": [
          "Piperacillin",
          "Cefepime",
          "Ceftazidime",
          "Meropenem",
          "Ciprofloxacin",
          "Levofloxacin",
          "Amikacin",
          "Tobramycin",
          "Aztreonam"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Pseudomonas Presentations",
            "keywords": [],
            "note": "Non-fermenting Gram-negative rod with intrinsic resistance to Ceftriaxone, Ertapenem, Aminopenicillins, and Tetracyclines."
          },
          {
            "id": "hap_vap",
            "label": "HAP / Ventilator Pneumonia",
            "keywords": [
              "pneumonia",
              "nosocomial",
              "respiratory",
              "piperacillin",
              "cefepime",
              "meropenem",
              "ceftazidime",
              "tobramycin"
            ],
            "note": "Nosocomial Pneumonia: Extended-infusion Piperacillin/Tazobactam, Cefepime, Ceftazidime, or Meropenem."
          },
          {
            "id": "uti",
            "label": "Complicated UTI / Pyelonephritis",
            "keywords": [
              "urinary",
              "pyelonephritis",
              "ciprofloxacin",
              "levofloxacin",
              "cefepime",
              "ceftazidime",
              "amikacin"
            ],
            "note": "Pseudomonal UTI: Ciprofloxacin/Levofloxacin or IV Cefepime/Ceftazidime/Aminoglycoside."
          },
          {
            "id": "bone_ear",
            "label": "Malignant Otitis Externa / Osteomyelitis",
            "keywords": [
              "bone",
              "osteomyelitis",
              "otitis",
              "ciprofloxacin",
              "cefepime",
              "ceftazidime",
              "piperacillin"
            ],
            "note": "Skull-Base / Foot Puncture Osteomyelitis: High-dose Ciprofloxacin or IV antipseudomonal beta-lactam for 6 weeks."
          }
        ]
      },
      {
        "canonical": "Klebsiella pneumoniae",
        "aliases": [
          "klebsiella pneumoniae",
          "klebsiella",
          "klebsiela pneumoniae"
        ],
        "nihTerm": "Klebsiella Infections",
        "fdaSearch": "klebsiella pneumoniae",
        "isPathogen": true,
        "curatedDrugs": [
          "Ceftriaxone",
          "Cefotaxime",
          "Piperacillin-tazobactam",
          "Meropenem",
          "Ertapenem",
          "Cefepime",
          "Ciprofloxacin",
          "Gentamicin",
          "Amikacin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Klebsiella Presentations",
            "keywords": [],
            "note": "Intrinsically resistant to Ampicillin/Amoxicillin (chromosomal SHV-1 beta-lactamase)."
          },
          {
            "id": "pneumonia",
            "label": "Necrotizing Pneumonia / HAP",
            "keywords": [
              "necrotizing pneumonia",
              "hospital-acquired pneumonia",
              "ventilator-associated pneumonia",
              "pneumonia"
            ],
            "note": "Pulmonary infection: select an active systemic agent according to susceptibility; carbapenems are generally reserved for resistant organisms."
          },
          {
            "id": "uti",
            "label": "Complicated UTI / Pyelonephritis",
            "keywords": [
              "complicated urinary tract infection",
              "urinary tract infection",
              "pyelonephritis",
              "urosepsis"
            ],
            "note": "Complicated UTI / renal-parenchymal infection: choose a systemic agent according to susceptibility and severity. Nitrofurantoin is not suitable for pyelonephritis."
          },
          {
            "id": "liver_abscess",
            "label": "Pyogenic Liver Abscess",
            "keywords": [
              "pyogenic liver abscess",
              "hepatic abscess",
              "liver abscess"
            ],
            "note": "Pyogenic liver abscess requires imaging, drainage when indicated, cultures, and susceptibility-directed systemic antibiotics."
          }
        ]
      },
      {
        "canonical": "Streptococcus pneumoniae",
        "aliases": [
          "streptococcus pneumoniae",
          "strep pneumoniae",
          "pneumococcus",
          "streptococus pneumoniae"
        ],
        "nihTerm": "Pneumococcal Infections",
        "fdaSearch": "streptococcus pneumoniae",
        "isPathogen": true,
        "curatedDrugs": [
          "Amoxicillin",
          "Ceftriaxone",
          "Levofloxacin",
          "Vancomycin",
          "Azithromycin",
          "Doxycycline"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Pneumococcal Presentations",
            "keywords": [],
            "note": "Leading cause of CAP, acute otitis media, sinusitis, and adult bacterial meningitis."
          },
          {
            "id": "cap",
            "label": "Community-Acquired Pneumonia",
            "keywords": [
              "pneumonia",
              "respiratory",
              "bronchitis",
              "amoxicillin",
              "ceftriaxone",
              "levofloxacin",
              "azithromycin",
              "doxycycline"
            ],
            "note": "Pneumococcal Pneumonia: High-dose Amoxicillin, Ceftriaxone, or Respiratory Fluoroquinolone."
          },
          {
            "id": "meningitis",
            "label": "Bacterial Meningitis",
            "keywords": [
              "meningitis",
              "central nervous",
              "ceftriaxone",
              "vancomycin",
              "meropenem"
            ],
            "note": "Pneumococcal Meningitis: Empiric Ceftriaxone 2g IV Q12H + Vancomycin + Dexamethasone."
          },
          {
            "id": "ent",
            "label": "Otitis Media & Sinusitis",
            "keywords": [
              "otitis",
              "sinusitis",
              "ear",
              "amoxicillin",
              "cefdinir",
              "cefuroxime"
            ],
            "note": "Acute Otitis Media / Sinusitis: Amoxicillin or Amoxicillin/Clavulanate."
          }
        ]
      },
      {
        "canonical": "Streptococcus pyogenes",
        "aliases": [
          "streptococcus pyogenes",
          "strep pyogenes",
          "group a strep",
          "gas"
        ],
        "nihTerm": "Streptococcal Infections",
        "fdaSearch": "streptococcus pyogenes",
        "isPathogen": true,
        "curatedDrugs": [
          "Penicillin V",
          "Amoxicillin",
          "Penicillin G",
          "Cefazolin",
          "Clindamycin",
          "Vancomycin",
          "Azithromycin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Group A Strep Presentations",
            "keywords": [],
            "note": "Universally susceptible to Beta-Lactams. In necrotizing fasciitis/toxic shock, add Clindamycin or Linezolid for exotoxin suppression."
          },
          {
            "id": "pharyngitis",
            "label": "Pharyngitis / Tonsillitis",
            "keywords": [
              "pharyngitis",
              "tonsillitis",
              "throat",
              "penicillin",
              "amoxicillin",
              "azithromycin"
            ],
            "note": "Guideline options are not ranked by FDA card order: oral Penicillin V or Amoxicillin for 10 days are preferred oral regimens; benzathine Penicillin G by IM injection as a single dose is also a guideline-listed option (adult dose 1.2 million units; pediatric dosing is weight-based). Macrolides are alternatives for selected penicillin-allergic patients; resistance varies."
          },
          {
            "id": "skin_nec",
            "label": "Erysipelas / Cellulitis / Necrotizing Fasciitis",
            "keywords": [
              "skin",
              "cellulitis",
              "erysipelas",
              "fasciitis",
              "clindamycin",
              "penicillin",
              "cefazolin",
              "vancomycin"
            ],
            "note": "Invasive GAS / Necrotizing Fasciitis: Emergent surgical debridement + High-dose Penicillin G + Clindamycin."
          }
        ]
      },
      {
        "canonical": "Enterococcus faecium",
        "aliases": [
          "enterococcus faecium",
          "e. faecium",
          "e faecium",
          "faecium"
        ],
        "nihTerm": "Enterococcus Infections",
        "fdaSearch": "enterococcus faecium",
        "isPathogen": true,
        "curatedDrugs": [
          "Ampicillin",
          "Piperacillin-tazobactam",
          "Vancomycin",
          "Linezolid",
          "Daptomycin",
          "Gentamicin",
          "Nitrofurantoin",
          "Fosfomycin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All E. faecium Presentations",
            "keywords": [],
            "note": "E. faecium is a distinct species. Species-specific susceptibility is required; this existing educational agent map does not establish activity or a preferred regimen."
          },
          {
            "id": "bacteremia_endo",
            "label": "Bacteremia & Endocarditis",
            "keywords": [
              "bacteremia",
              "septicemia",
              "endocarditis"
            ],
            "note": "E. faecium bacteremia / endocarditis requires organism-specific susceptibility and guideline review. Do not transfer an E. faecalis combination regimen or infer vancomycin resistance from the species name."
          },
          {
            "id": "uti",
            "label": "Urinary Tract Infection",
            "keywords": [
              "urinary tract infection",
              "cystitis",
              "complicated UTI"
            ],
            "note": "For lower-tract infection, use a susceptible urinary agent; systemic illness or upper-tract infection requires a systemic regimen. E. faecium susceptibility must be established."
          },
          {
            "id": "intra_abd",
            "label": "Intra-Abdominal Infection",
            "keywords": [
              "intra-abdominal infection",
              "peritonitis",
              "abdominal sepsis"
            ],
            "note": "Enterococcal coverage is selective rather than routine; E. faecium identification, susceptibility, healthcare association, severity, and source determine its relevance."
          }
        ]
      },
      {
        "canonical": "Enterococcus faecalis",
        "aliases": [
          "enterococcus faecalis",
          "e. faecalis",
          "e faecalis",
          "faecalis"
        ],
        "nihTerm": "Enterococcus Infections",
        "fdaSearch": "enterococcus faecalis",
        "isPathogen": true,
        "curatedDrugs": [
          "Ampicillin",
          "Piperacillin-tazobactam",
          "Vancomycin",
          "Linezolid",
          "Daptomycin",
          "Gentamicin",
          "Nitrofurantoin",
          "Fosfomycin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All E. faecalis Presentations",
            "keywords": [],
            "note": "E. faecalis is a distinct species. Species-specific susceptibility is required; the existing enterococcal agent associations do not establish activity, synergy, or a preferred regimen."
          },
          {
            "id": "bacteremia_endo",
            "label": "Bacteremia & Endocarditis",
            "keywords": [
              "bacteremia",
              "septicemia",
              "endocarditis"
            ],
            "note": "E. faecalis bacteremia / endocarditis requires organism-specific guideline review, susceptibility, and assessment of combination requirements. A retrieved single-agent label does not establish a complete combination regimen."
          },
          {
            "id": "uti",
            "label": "Urinary Tract Infection",
            "keywords": [
              "urinary tract infection",
              "cystitis",
              "complicated UTI"
            ],
            "note": "For lower-tract infection, use a susceptible urinary agent; systemic illness or upper-tract infection requires a systemic regimen. E. faecalis susceptibility must be established."
          },
          {
            "id": "intra_abd",
            "label": "Intra-Abdominal Infection",
            "keywords": [
              "intra-abdominal infection",
              "peritonitis",
              "abdominal sepsis"
            ],
            "note": "Enterococcal coverage is selective rather than routine; E. faecalis identification, susceptibility, healthcare association, severity, and source determine its relevance."
          }
        ]
      },
      {
        "canonical": "Enterococcus spp.",
        "aliases": [
          "enterococcus",
          "enterococci",
          "enterococcus spp",
          "enterococcus spp.",
          "vre",
          "vancomycin-resistant enterococci",
          "vancomycin resistant enterococci"
        ],
        "nihTerm": "Enterococcus Infections",
        "fdaSearch": "enterococcus",
        "isPathogen": true,
        "curatedDrugs": [],
        "diseases": [
          {
            "id": "all",
            "label": "Species Not Specified",
            "keywords": [],
            "note": "Select Enterococcus faecalis or Enterococcus faecium to inspect the species-specific association map. Enterococcus names a genus; VRE names a resistance phenotype and does not identify a species. No species-specific treatment is inferred from this input."
          }
        ]
      },
      {
        "canonical": "Pasteurella multocida",
        "aliases": [
          "pasteurella",
          "pasteurella multocida",
          "pasteurella multicida",
          "pasturella",
          "pasteurella septica",
          "pasteurella canis"
        ],
        "nihTerm": "Pasteurella Infections",
        "fdaSearch": "pasteurella",
        "isPathogen": true,
        "curatedDrugs": [
          "Amoxicillin-clavulanate",
          "Ampicillin-sulbactam",
          "Piperacillin-tazobactam",
          "Amoxicillin",
          "Doxycycline",
          "Ceftriaxone",
          "Ciprofloxacin",
          "Levofloxacin",
          "Penicillin G",
          "Azithromycin",
          "Sulfamethoxazole and Trimethoprim"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Pasteurella Presentations",
            "keywords": [],
            "note": "Pasteurella multocida is a Gram-negative coccobacillus found in the oral flora of cats and dogs. Select the bite / skin presentation to inspect guideline-preferred bite regimens; treatment depends on the infection site."
          },
          {
            "id": "bite_skin",
            "label": "Animal Bite / Cellulitis & Abscess",
            "keywords": [
              "skin",
              "bite",
              "soft tissue",
              "cellulitis",
              "abscess",
              "wound",
              "amoxicillin",
              "doxycycline",
              "moxifloxacin"
            ],
            "note": "Cat/Dog Bite Cellulitis: First-line Amoxicillin/Clavulanate PO or Ampicillin/Sulbactam IV."
          },
          {
            "id": "bone_joint",
            "label": "Osteomyelitis & Septic Arthritis",
            "keywords": [
              "bone",
              "joint",
              "osteomyelitis",
              "arthritis",
              "tenosynovitis",
              "ceftriaxone",
              "piperacillin",
              "penicillin",
              "levofloxacin"
            ],
            "note": "Deep Cat-Bite Tenosynovitis / Septic Arthritis / Osteomyelitis: IV Ceftriaxone, Ampicillin/Sulbactam, or Piperacillin/Tazobactam."
          },
          {
            "id": "respiratory",
            "label": "Respiratory Tract / Pneumonia",
            "keywords": [
              "respiratory",
              "pneumonia",
              "bronchitis",
              "sinusitis",
              "empyema",
              "ceftriaxone",
              "amoxicillin",
              "doxycycline",
              "levofloxacin",
              "azithromycin"
            ],
            "note": "Pasteurella Pneumonia: Typically in COPD/bronchiectasis patients with pet exposure."
          },
          {
            "id": "cns_sepsis",
            "label": "Bacteremia & CNS Meningitis",
            "keywords": [
              "bacteremia",
              "septicemia",
              "meningitis",
              "endocarditis",
              "ceftriaxone",
              "meropenem",
              "penicillin",
              "ciprofloxacin"
            ],
            "note": "Invasive Pasteurella Bacteremia / Meningitis: High-dose IV Ceftriaxone or Meropenem."
          }
        ]
      },
      {
        "canonical": "Borrelia burgdorferi",
        "aliases": [
          "borrelia burgdorferi",
          "borrelia",
          "borellia"
        ],
        "nihTerm": "Lyme Disease",
        "fdaSearch": "borrelia",
        "isPathogen": true,
        "curatedDrugs": [
          "Doxycycline",
          "Amoxicillin",
          "Cefuroxime",
          "Ceftriaxone"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Borrelia (Lyme) Stages",
            "keywords": [],
            "note": "Tick-borne spirochete (Ixodes). Stage-dependent oral vs. parenteral therapy."
          },
          {
            "id": "early",
            "label": "Erythema Migrans (Early Localized)",
            "keywords": [
              "doxycycline",
              "amoxicillin",
              "cefuroxime"
            ],
            "note": "Early Lyme: Doxycycline 100mg PO BID (10 days) or Amoxicillin / Cefuroxime axetil (14 days)."
          },
          {
            "id": "neuro_cardio",
            "label": "Neuroborreliosis / Meningitis / Carditis",
            "keywords": [
              "ceftriaxone",
              "doxycycline",
              "meningitis"
            ],
            "note": "CNS Neuroborreliosis / High-Degree AV Block: Ceftriaxone 2g IV OD (or oral Doxycycline for isolated facial nerve palsy)."
          }
        ]
      },
      {
        "canonical": "Listeria monocytogenes",
        "aliases": [
          "listeria monocytogenes",
          "listeria",
          "listiria"
        ],
        "nihTerm": "Listeria Infections",
        "fdaSearch": "listeria monocytogenes",
        "isPathogen": true,
        "curatedDrugs": [
          "Ampicillin",
          "Amoxicillin",
          "Gentamicin",
          "Sulfamethoxazole and Trimethoprim",
          "Meropenem"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Listeria Presentations",
            "keywords": [],
            "note": "CRITICAL PEARL: Cephalosporins (Ceftriaxone, Cefotaxime, Cefepime) have ZERO activity against Listeria monocytogenes."
          },
          {
            "id": "meningitis",
            "label": "CNS Meningitis / Rhombencephalitis",
            "keywords": [
              "meningitis",
              "ampicillin",
              "gentamicin",
              "sulfamethoxazole",
              "meropenem"
            ],
            "note": "Listeria Meningitis: High-dose Ampicillin 2g IV Q4H + Gentamicin. PCN-allergic: IV TMP-SMX."
          }
        ]
      },
      {
        "canonical": "Neisseria meningitidis",
        "aliases": [
          "neisseria meningitidis",
          "meningococcus",
          "meningococcal"
        ],
        "nihTerm": "Meningococcal Infections",
        "fdaSearch": "neisseria meningitidis",
        "isPathogen": true,
        "curatedDrugs": [
          "Ceftriaxone",
          "Cefotaxime",
          "Penicillin G",
          "Ciprofloxacin",
          "Rifampin"
        ],
        "diseases": [
          {
            "id": "all",
            "label": "All Meningococcal Roles",
            "keywords": [],
            "note": "Requires immediate droplet precautions, parenteral therapy, and close-contact chemoprophylaxis."
          },
          {
            "id": "meningitis",
            "label": "Acute Meningitis & Meningococcemia",
            "keywords": [
              "ceftriaxone",
              "cefotaxime",
              "penicillin"
            ],
            "note": "Active Infection: Ceftriaxone 2g IV Q12H or Cefotaxime."
          },
          {
            "id": "prophylaxis",
            "label": "Close-Contact Chemoprophylaxis",
            "keywords": [
              "rifampin",
              "ciprofloxacin",
              "ceftriaxone"
            ],
            "note": "Close-Contact Eradication: Single-dose Ciprofloxacin 500mg PO, Rifampin x 2 days, or single-dose IM Ceftriaxone."
          }
        ]
      }
    ],
    "syndromeTerms": [
      {
        "label": "Community-Acquired Pneumonia",
        "fdaQuery": "pneumonia",
        "nihTerm": "Pneumonia"
      },
      {
        "label": "Nosocomial / Ventilator Pneumonia",
        "fdaQuery": "nosocomial pneumonia",
        "nihTerm": "Pneumonia, Bacterial"
      },
      {
        "label": "Bacterial Meningitis",
        "fdaQuery": "meningitis",
        "nihTerm": "Meningitis, Bacterial"
      },
      {
        "label": "Brain Abscess",
        "fdaQuery": "brain abscess",
        "nihTerm": "Brain Abscess"
      },
      {
        "label": "Infective Endocarditis",
        "fdaQuery": "endocarditis",
        "nihTerm": "Endocarditis, Bacterial"
      },
      {
        "label": "Bacteremia / Septicemia",
        "fdaQuery": "septicemia",
        "nihTerm": "Bacteremia"
      },
      {
        "label": "Osteomyelitis (Acute / Chronic)",
        "fdaQuery": "osteomyelitis",
        "nihTerm": "Osteomyelitis"
      },
      {
        "label": "Septic Arthritis",
        "fdaQuery": "septic arthritis",
        "nihTerm": "Arthritis, Infectious"
      },
      {
        "label": "Acute Pyelonephritis",
        "fdaQuery": "pyelonephritis",
        "nihTerm": "Pyelonephritis"
      },
      {
        "label": "Complicated / Uncomplicated UTI",
        "fdaQuery": "urinary tract infection",
        "nihTerm": "Urinary Tract Infections"
      },
      {
        "label": "Acute Bacterial Prostatitis",
        "fdaQuery": "prostatitis",
        "nihTerm": "Prostatitis"
      },
      {
        "label": "Pelvic Inflammatory Disease",
        "fdaQuery": "pelvic inflammatory disease",
        "nihTerm": "Pelvic Inflammatory Disease"
      },
      {
        "label": "Cellulitis & Skin Structure",
        "fdaQuery": "skin and skin structure",
        "nihTerm": "Cellulitis"
      },
      {
        "label": "Diabetic Foot Infection",
        "fdaQuery": "diabetic foot",
        "nihTerm": "Foot Ulcer"
      },
      {
        "label": "Intra-Abdominal Infection / Peritonitis",
        "fdaQuery": "intra-abdominal",
        "nihTerm": "Peritonitis"
      },
      {
        "label": "Pyogenic Liver Abscess",
        "fdaQuery": "liver abscess",
        "nihTerm": "Liver Abscess"
      },
      {
        "label": "Clostridioides difficile Colitis",
        "fdaQuery": "difficile",
        "nihTerm": "Enterocolitis, Pseudomembranous"
      },
      {
        "label": "Acute Cholecystitis / Cholangitis",
        "fdaQuery": "cholecystitis",
        "nihTerm": "Cholecystitis"
      },
      {
        "label": "Febrile Neutropenia",
        "fdaQuery": "febrile neutropenia",
        "nihTerm": "Febrile Neutropenia"
      },
      {
        "label": "Syphilis",
        "fdaQuery": "syphilis",
        "nihTerm": "Syphilis"
      },
      {
        "label": "Neurosyphilis",
        "fdaQuery": "neurosyphilis",
        "nihTerm": "Neurosyphilis"
      },
      {
        "label": "Gonorrhea",
        "fdaQuery": "gonorrhea",
        "nihTerm": "Gonorrhea"
      },
      {
        "label": "Chlamydia trachomatis",
        "fdaQuery": "chlamydia",
        "nihTerm": "Chlamydia Infections"
      },
      {
        "label": "Pulmonary Tuberculosis",
        "fdaQuery": "tuberculosis",
        "nihTerm": "Tuberculosis"
      },
      {
        "label": "Invasive Candidiasis",
        "fdaQuery": "candidemia",
        "nihTerm": "Candidiasis"
      },
      {
        "label": "Invasive Aspergillosis",
        "fdaQuery": "aspergillosis",
        "nihTerm": "Aspergillosis"
      },
      {
        "label": "Acute Bacterial Sinusitis",
        "fdaQuery": "sinusitis",
        "nihTerm": "Sinusitis"
      },
      {
        "label": "Acute Otitis Media",
        "fdaQuery": "otitis media",
        "nihTerm": "Otitis Media"
      },
      {
        "label": "Streptococcal Pharyngitis",
        "fdaQuery": "pharyngitis",
        "nihTerm": "Pharyngitis"
      },
      {
        "label": "Helicobacter pylori",
        "fdaQuery": "helicobacter pylori",
        "nihTerm": "Helicobacter Infections"
      }
    ],
    "syndromeMap": {
      "Community-Acquired Pneumonia": {
        "contextKeywords": [
          "community-acquired pneumonia",
          "community acquired pneumonia"
        ],
        "note": "Adult educational overview. Outpatient vs inpatient status, comorbidities, severity, local resistance, and MRSA/Pseudomonas risk determine the regimen; this is not a patient-specific empiric protocol.",
        "pathogens": [
          {
            "id": "spn",
            "label": "S. pneumoniae",
            "agents": [
              "Amoxicillin",
              "Ceftriaxone",
              "Levofloxacin",
              "Moxifloxacin",
              "Doxycycline"
            ]
          },
          {
            "id": "hflu",
            "label": "H. influenzae",
            "agents": [
              "Amoxicillin-clavulanate",
              "Ceftriaxone",
              "Cefuroxime",
              "Levofloxacin",
              "Doxycycline"
            ]
          },
          {
            "id": "mycoplasma",
            "label": "M. pneumoniae",
            "agents": [
              "Azithromycin",
              "Doxycycline",
              "Levofloxacin",
              "Moxifloxacin"
            ]
          },
          {
            "id": "chlamydia-pneumoniae",
            "label": "C. pneumoniae",
            "agents": [
              "Azithromycin",
              "Doxycycline",
              "Levofloxacin",
              "Moxifloxacin"
            ]
          },
          {
            "id": "legionella",
            "label": "Legionella spp.",
            "agents": [
              "Azithromycin",
              "Levofloxacin",
              "Moxifloxacin"
            ]
          },
          {
            "id": "moraxella",
            "label": "M. catarrhalis",
            "agents": [
              "Amoxicillin-clavulanate",
              "Ceftriaxone",
              "Cefuroxime",
              "Doxycycline"
            ]
          },
          {
            "id": "staph-aureus",
            "label": "S. aureus (risk-based)",
            "agents": [
              "Vancomycin",
              "Linezolid"
            ]
          },
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa (risk-based)",
            "agents": [
              "Piperacillin-tazobactam",
              "Cefepime",
              "Ceftazidime",
              "Meropenem"
            ]
          }
        ]
      },
      "Nosocomial / Ventilator Pneumonia": {
        "contextKeywords": [
          "hospital-acquired pneumonia",
          "hospital acquired pneumonia",
          "ventilator-associated pneumonia",
          "ventilator associated pneumonia",
          "nosocomial pneumonia"
        ],
        "note": "Use local antibiogram, prior cultures, severity, and validated MRSA/Pseudomonas risk to select and narrow therapy.",
        "pathogens": [
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa",
            "agents": [
              "Piperacillin-tazobactam",
              "Cefepime",
              "Ceftazidime",
              "Meropenem",
              "Imipenem and Cilastatin",
              "Ciprofloxacin",
              "Tobramycin"
            ]
          },
          {
            "id": "mrsa",
            "label": "MRSA",
            "agents": [
              "Vancomycin",
              "Linezolid"
            ]
          },
          {
            "id": "enterobacterales",
            "label": "Enterobacterales",
            "agents": [
              "Cefepime",
              "Piperacillin-tazobactam",
              "Meropenem",
              "Ertapenem"
            ]
          }
        ]
      },
      "Bacterial Meningitis": {
        "contextKeywords": [
          "bacterial meningitis",
          "meningitis",
          "CNS infection"
        ],
        "note": "Empiric coverage depends on age, immune status, pregnancy, Listeria risk, and local resistance; this is not a complete empiric regimen.",
        "pathogens": [
          {
            "id": "pneumococcus",
            "label": "S. pneumoniae",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime",
              "Vancomycin"
            ]
          },
          {
            "id": "meningococcus",
            "label": "N. meningitidis",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime"
            ]
          },
          {
            "id": "listeria",
            "label": "L. monocytogenes (risk-based)",
            "agents": [
              "Ampicillin",
              "Meropenem"
            ]
          },
          {
            "id": "hflu",
            "label": "H. influenzae",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime"
            ]
          }
        ]
      },
      "Brain Abscess": {
        "contextKeywords": [
          "brain abscess",
          "cerebral abscess",
          "intracranial abscess"
        ],
        "note": "Drainage, neurosurgical context, immune status, prior surgery, and cultures determine therapy. This map is an organism-oriented overview, not a complete regimen.",
        "pathogens": [
          {
            "id": "streptococci",
            "label": "Streptococci / S. anginosus group",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime",
              "Metronidazole"
            ]
          },
          {
            "id": "anaerobes",
            "label": "Oral anaerobes",
            "agents": [
              "Metronidazole",
              "Meropenem"
            ]
          },
          {
            "id": "staph-aureus",
            "label": "S. aureus (post-neurosurgical / risk-based)",
            "agents": [
              "Vancomycin",
              "Ceftriaxone",
              "Cefepime"
            ]
          },
          {
            "id": "gram-negative",
            "label": "Gram-negative bacilli (selected cases)",
            "agents": [
              "Cefepime",
              "Meropenem"
            ]
          }
        ]
      },
      "Infective Endocarditis": {
        "contextKeywords": [
          "infective endocarditis",
          "endocarditis",
          "valve infection"
        ],
        "note": "Regimens depend on native vs prosthetic valve, acuity, organism, and susceptibility; culture-directed therapy is essential.",
        "pathogens": [
          {
            "id": "staph-aureus",
            "label": "S. aureus",
            "agents": [
              "Vancomycin",
              "Cefazolin",
              "Oxacillin",
              "Nafcillin",
              "Daptomycin"
            ]
          },
          {
            "id": "streptococci",
            "label": "Viridans streptococci",
            "agents": [
              "Penicillin G",
              "Ceftriaxone",
              "Vancomycin"
            ]
          },
          {
            "id": "enterococcus",
            "label": "Enterococcus spp.",
            "agents": [
              "Ampicillin",
              "Vancomycin",
              "Gentamicin"
            ]
          },
          {
            "id": "hacek",
            "label": "HACEK organisms",
            "agents": [
              "Ceftriaxone"
            ]
          }
        ]
      },
      "Bacteremia / Septicemia": {
        "contextKeywords": [
          "bloodstream infection",
          "bacteremia",
          "septicemia"
        ],
        "note": "Blood cultures, source, severity, resistance risks, and source control determine treatment; this is an organism map, not a universal sepsis regimen.",
        "pathogens": [
          {
            "id": "staph-aureus",
            "label": "S. aureus",
            "agents": [
              "Vancomycin",
              "Cefazolin",
              "Oxacillin",
              "Nafcillin",
              "Daptomycin"
            ]
          },
          {
            "id": "enterobacterales",
            "label": "Enterobacterales",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          },
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa",
            "agents": [
              "Cefepime",
              "Ceftazidime",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          },
          {
            "id": "enterococcus",
            "label": "Enterococcus spp.",
            "agents": [
              "Ampicillin",
              "Vancomycin",
              "Linezolid",
              "Daptomycin"
            ]
          }
        ]
      },
      "Osteomyelitis (Acute / Chronic)": {
        "contextKeywords": [
          "osteomyelitis",
          "bone infection"
        ],
        "note": "Obtain cultures when feasible; therapy depends on site, hardware, chronicity, source control, and susceptibility.",
        "pathogens": [
          {
            "id": "staph-aureus",
            "label": "S. aureus",
            "agents": [
              "Cefazolin",
              "Oxacillin",
              "Nafcillin",
              "Vancomycin",
              "Daptomycin"
            ]
          },
          {
            "id": "streptococci",
            "label": "Streptococci",
            "agents": [
              "Cefazolin",
              "Ceftriaxone",
              "Penicillin G"
            ]
          },
          {
            "id": "gram-negative",
            "label": "Gram-negative bacilli",
            "agents": [
              "Cefepime",
              "Ceftazidime",
              "Ciprofloxacin",
              "Meropenem"
            ]
          }
        ]
      },
      "Septic Arthritis": {
        "contextKeywords": [
          "septic arthritis",
          "infectious arthritis",
          "joint infection"
        ],
        "note": "Joint aspiration and drainage are central; selection depends on Gram stain, cultures, age, and gonococcal risk.",
        "pathogens": [
          {
            "id": "staph-aureus",
            "label": "S. aureus",
            "agents": [
              "Vancomycin",
              "Cefazolin",
              "Oxacillin"
            ]
          },
          {
            "id": "streptococci",
            "label": "Streptococci",
            "agents": [
              "Cefazolin",
              "Ceftriaxone",
              "Penicillin G"
            ]
          },
          {
            "id": "gonococcus",
            "label": "N. gonorrhoeae",
            "agents": [
              "Ceftriaxone"
            ]
          },
          {
            "id": "gram-negative",
            "label": "Gram-negative bacilli",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Ceftazidime"
            ]
          }
        ]
      },
      "Acute Pyelonephritis": {
        "contextKeywords": [
          "pyelonephritis",
          "renal parenchymal infection",
          "upper urinary tract"
        ],
        "note": "Use urine culture and local susceptibility. Nitrofurantoin and oral fosfomycin are not suitable for renal parenchymal infection.",
        "pathogens": [
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Ceftriaxone",
              "Ciprofloxacin",
              "Levofloxacin",
              "Piperacillin-tazobactam",
              "Ertapenem",
              "Meropenem",
              "Gentamicin"
            ]
          },
          {
            "id": "klebsiella",
            "label": "Klebsiella spp.",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Ertapenem",
              "Meropenem",
              "Gentamicin"
            ]
          },
          {
            "id": "proteus",
            "label": "Proteus spp.",
            "agents": [
              "Ceftriaxone",
              "Ciprofloxacin",
              "Piperacillin-tazobactam",
              "Gentamicin"
            ]
          },
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa (risk-based)",
            "agents": [
              "Cefepime",
              "Ceftazidime",
              "Piperacillin-tazobactam",
              "Meropenem",
              "Ciprofloxacin"
            ]
          }
        ]
      },
      "Complicated / Uncomplicated UTI": {
        "contextKeywords": [
          "urinary tract infection",
          "cystitis",
          "complicated UTI",
          "UTI"
        ],
        "note": "Cystitis and pyelonephritis are different syndromes. Nitrofurantoin/fosfomycin apply to selected lower-tract infection, not systemic or renal-parenchymal infection.",
        "pathogens": [
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Nitrofurantoin",
              "Fosfomycin",
              "Trimethoprim",
              "Sulfamethoxazole and Trimethoprim",
              "Cefalexin",
              "Ceftriaxone",
              "Ciprofloxacin"
            ]
          },
          {
            "id": "klebsiella",
            "label": "Klebsiella spp.",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Ertapenem",
              "Meropenem"
            ]
          },
          {
            "id": "proteus",
            "label": "Proteus spp.",
            "agents": [
              "Cefalexin",
              "Ceftriaxone",
              "Ciprofloxacin"
            ]
          },
          {
            "id": "enterococcus",
            "label": "Enterococcus spp.",
            "agents": [
              "Ampicillin",
              "Nitrofurantoin",
              "Fosfomycin",
              "Vancomycin"
            ]
          }
        ]
      },
      "Acute Bacterial Prostatitis": {
        "contextKeywords": [
          "acute bacterial prostatitis",
          "bacterial prostatitis",
          "prostatitis"
        ],
        "note": "Urine culture, severity, urinary retention, prostatic penetration, and local fluoroquinolone resistance determine selection; nitrofurantoin is not a prostatitis treatment.",
        "pathogens": [
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Ciprofloxacin",
              "Levofloxacin",
              "Trimethoprim",
              "Sulfamethoxazole and Trimethoprim",
              "Ceftriaxone"
            ]
          },
          {
            "id": "enterobacterales",
            "label": "Other Enterobacterales",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          },
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa (healthcare-associated risk)",
            "agents": [
              "Ciprofloxacin",
              "Cefepime",
              "Ceftazidime",
              "Piperacillin-tazobactam"
            ]
          }
        ]
      },
      "Cellulitis & Skin Structure": {
        "contextKeywords": [
          "cellulitis",
          "skin and skin structure",
          "skin infection",
          "soft tissue infection"
        ],
        "note": "Purulence, systemic toxicity, exposure, and MRSA risk change coverage; abscesses require drainage when indicated.",
        "pathogens": [
          {
            "id": "streptococci",
            "label": "Beta-hemolytic streptococci",
            "agents": [
              "Cefazolin",
              "Cloxacillin",
              "Cephalexin",
              "Penicillin G"
            ]
          },
          {
            "id": "mssa",
            "label": "MSSA",
            "agents": [
              "Cefazolin",
              "Cloxacillin",
              "Oxacillin",
              "Nafcillin"
            ]
          },
          {
            "id": "mrsa",
            "label": "MRSA (risk-based)",
            "agents": [
              "Vancomycin",
              "Doxycycline",
              "Clindamycin",
              "Linezolid",
              "Sulfamethoxazole and Trimethoprim"
            ]
          }
        ]
      },
      "Intra-Abdominal Infection / Peritonitis": {
        "contextKeywords": [
          "intra-abdominal infection",
          "peritonitis",
          "abdominal sepsis",
          "biliary infection"
        ],
        "note": "Coverage is usually polymicrobial and must include enteric Gram-negative bacilli and anaerobes when indicated. Source control and local resistance are central; fluoroquinolones require local susceptibility support. Routine empiric Candida coverage is not recommended for community-acquired infection.",
        "pathogens": [
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Piperacillin-tazobactam",
              "Ceftriaxone",
              "Cefepime",
              "Meropenem",
              "Ertapenem",
              "Ciprofloxacin",
              "Metronidazole"
            ]
          },
          {
            "id": "klebsiella",
            "label": "Klebsiella spp.",
            "agents": [
              "Piperacillin-tazobactam",
              "Ceftriaxone",
              "Cefepime",
              "Meropenem",
              "Ertapenem",
              "Metronidazole"
            ]
          },
          {
            "id": "bacteroides",
            "label": "Bacteroides / anaerobes",
            "agents": [
              "Metronidazole",
              "Piperacillin-tazobactam",
              "Meropenem",
              "Ertapenem"
            ]
          },
          {
            "id": "enterococcus",
            "label": "Enterococcus (selected risk)",
            "agents": [
              "Ampicillin",
              "Piperacillin-tazobactam",
              "Vancomycin"
            ]
          }
        ]
      },
      "Pyogenic Liver Abscess": {
        "contextKeywords": [
          "pyogenic liver abscess",
          "hepatic abscess",
          "liver abscess"
        ],
        "note": "Imaging, drainage/source control, cultures, and susceptibility-directed systemic therapy are central. Coverage depends on community vs healthcare acquisition and local resistance; this is not a fixed empiric regimen.",
        "pathogens": [
          {
            "id": "klebsiella",
            "label": "Klebsiella pneumoniae",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime",
              "Piperacillin-tazobactam",
              "Ertapenem",
              "Meropenem"
            ]
          },
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime",
              "Piperacillin-tazobactam",
              "Ertapenem",
              "Meropenem"
            ]
          },
          {
            "id": "streptococci",
            "label": "Streptococci / S. anginosus group",
            "agents": [
              "Ceftriaxone",
              "Cefotaxime",
              "Penicillin G"
            ]
          },
          {
            "id": "anaerobes",
            "label": "Anaerobes (polymicrobial cases)",
            "agents": [
              "Metronidazole",
              "Piperacillin-tazobactam",
              "Ertapenem",
              "Meropenem"
            ]
          }
        ]
      },
      "Diabetic Foot Infection": {
        "contextKeywords": [
          "diabetic foot infection",
          "diabetic foot ulcer infection",
          "infected diabetic foot"
        ],
        "note": "Severity, ischemia, necrosis, prior antibiotics, MRSA risk, Pseudomonas risk, and need for debridement/source control determine breadth. Not every case needs broad-spectrum therapy.",
        "pathogens": [
          {
            "id": "staph-aureus",
            "label": "S. aureus (MSSA / MRSA risk-based)",
            "agents": [
              "Cefazolin",
              "Cloxacillin",
              "Oxacillin",
              "Vancomycin",
              "Linezolid",
              "Doxycycline",
              "Amoxicillin-clavulanate"
            ]
          },
          {
            "id": "streptococci",
            "label": "Beta-hemolytic streptococci",
            "agents": [
              "Cefazolin",
              "Ceftriaxone",
              "Clindamycin"
            ]
          },
          {
            "id": "enterobacterales",
            "label": "Enterobacterales",
            "agents": [
              "Ceftriaxone",
              "Cefepime",
              "Ertapenem",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          },
          {
            "id": "anaerobes",
            "label": "Anaerobes (necrotic / ischemic infection)",
            "agents": [
              "Metronidazole",
              "Piperacillin-tazobactam",
              "Ertapenem",
              "Meropenem"
            ]
          },
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa (selected risk)",
            "agents": [
              "Cefepime",
              "Ceftazidime",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          }
        ]
      },
      "Acute Cholecystitis / Cholangitis": {
        "contextKeywords": [
          "cholecystitis",
          "cholangitis",
          "biliary infection"
        ],
        "note": "Enteric Gram-negative bacilli predominate; add anaerobic or enterococcal coverage according to anatomy, severity, and healthcare-associated risk.",
        "pathogens": [
          {
            "id": "ecoli",
            "label": "E. coli",
            "agents": [
              "Ceftriaxone",
              "Piperacillin-tazobactam",
              "Cefepime",
              "Meropenem",
              "Metronidazole"
            ]
          },
          {
            "id": "klebsiella",
            "label": "Klebsiella spp.",
            "agents": [
              "Ceftriaxone",
              "Piperacillin-tazobactam",
              "Cefepime",
              "Meropenem",
              "Metronidazole"
            ]
          },
          {
            "id": "enterococcus",
            "label": "Enterococcus (selected risk)",
            "agents": [
              "Ampicillin",
              "Piperacillin-tazobactam",
              "Vancomycin"
            ]
          },
          {
            "id": "anaerobes",
            "label": "Anaerobes (selected cases)",
            "agents": [
              "Metronidazole",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          }
        ]
      },
      "Clostridioides difficile Colitis": {
        "contextKeywords": [
          "clostridioides difficile",
          "C. difficile",
          "pseudomembranous colitis"
        ],
        "note": "Fidaxomicin or oral vancomycin are the principal options for most episodes. Metronidazole is not listed as routine stand-alone therapy; fulminant disease requires a separate specialist-guided regimen.",
        "pathogens": [
          {
            "id": "cdiff",
            "label": "C. difficile",
            "agents": [
              "Fidaxomicin",
              "Vancomycin"
            ]
          }
        ]
      },
      "Febrile Neutropenia": {
        "contextKeywords": [
          "febrile neutropenia",
          "neutropenic fever"
        ],
        "note": "Prompt risk assessment and antipseudomonal therapy are required; add Gram-positive coverage only for specific indications and tailor to cultures/local resistance.",
        "pathogens": [
          {
            "id": "pseudomonas",
            "label": "P. aeruginosa",
            "agents": [
              "Cefepime",
              "Ceftazidime",
              "Piperacillin-tazobactam",
              "Meropenem"
            ]
          },
          {
            "id": "enterobacterales",
            "label": "Enterobacterales",
            "agents": [
              "Cefepime",
              "Piperacillin-tazobactam",
              "Meropenem",
              "Ceftazidime"
            ]
          },
          {
            "id": "mrsa",
            "label": "MRSA (selected indications)",
            "agents": [
              "Vancomycin",
              "Linezolid"
            ]
          }
        ]
      },
      "Pelvic Inflammatory Disease": {
        "contextKeywords": [
          "pelvic inflammatory disease",
          "PID"
        ],
        "note": "Combination therapy should account for gonorrhea, chlamydia, and anaerobes; this organism map is not a complete regimen.",
        "pathogens": [
          {
            "id": "gonococcus",
            "label": "N. gonorrhoeae",
            "agents": [
              "Ceftriaxone"
            ]
          },
          {
            "id": "chlamydia",
            "label": "C. trachomatis",
            "agents": [
              "Doxycycline",
              "Azithromycin"
            ]
          },
          {
            "id": "anaerobes",
            "label": "Anaerobes",
            "agents": [
              "Metronidazole",
              "Clindamycin"
            ]
          }
        ]
      },
      "Gonorrhea": {
        "contextKeywords": [
          "gonorrhea",
          "neisseria gonorrhoeae"
        ],
        "note": "Ceftriaxone is the recommended backbone; add chlamydia treatment when coinfection has not been excluded, per current guidance.",
        "pathogens": [
          {
            "id": "gonococcus",
            "label": "N. gonorrhoeae",
            "agents": [
              "Ceftriaxone"
            ]
          },
          {
            "id": "chlamydia",
            "label": "C. trachomatis (if not excluded)",
            "agents": [
              "Doxycycline"
            ]
          }
        ]
      },
      "Chlamydia trachomatis": {
        "contextKeywords": [
          "chlamydia trachomatis",
          "chlamydial infection",
          "chlamydia"
        ],
        "note": "Doxycycline is generally preferred for uncomplicated infection in nonpregnant adults; pregnancy requires a different regimen.",
        "pathogens": [
          {
            "id": "chlamydia",
            "label": "C. trachomatis",
            "agents": [
              "Doxycycline",
              "Azithromycin"
            ]
          }
        ]
      },
      "Pulmonary Tuberculosis": {
        "contextKeywords": [
          "pulmonary tuberculosis",
          "active pulmonary tuberculosis",
          "tuberculosis"
        ],
        "note": "Active drug-susceptible TB requires combination therapy. The listed agents are components of a multidrug regimen, not alternatives or monotherapy; susceptibility results and current TB guidance are essential.",
        "pathogens": [
          {
            "id": "mtb",
            "label": "Mycobacterium tuberculosis",
            "agents": [
              "Isoniazid",
              "Rifampin",
              "Pyrazinamide",
              "Ethambutol"
            ]
          }
        ]
      },
      "Invasive Candidiasis": {
        "contextKeywords": [
          "invasive candidiasis",
          "candidemia",
          "systemic candidiasis"
        ],
        "note": "Species, susceptibility, severity, prior azole exposure, and source control determine selection.",
        "pathogens": [
          {
            "id": "candida",
            "label": "Candida spp.",
            "agents": [
              "Anidulafungin",
              "Caspofungin",
              "Fluconazole",
              "Amphotericin B"
            ]
          }
        ]
      },
      "Invasive Aspergillosis": {
        "contextKeywords": [
          "invasive aspergillosis",
          "aspergillosis"
        ],
        "note": "Treatment depends on species, susceptibility, host factors, and drug interactions.",
        "pathogens": [
          {
            "id": "aspergillus",
            "label": "Aspergillus spp.",
            "agents": [
              "Voriconazole",
              "Amphotericin B"
            ]
          }
        ]
      },
      "Acute Bacterial Sinusitis": {
        "contextKeywords": [
          "acute bacterial sinusitis",
          "sinusitis"
        ],
        "note": "Typical bacterial targets are S. pneumoniae, H. influenzae, and M. catarrhalis; many cases do not require antibiotics.",
        "pathogens": [
          {
            "id": "spn",
            "label": "S. pneumoniae",
            "agents": [
              "Amoxicillin",
              "Amoxicillin-clavulanate",
              "Doxycycline"
            ]
          },
          {
            "id": "hflu",
            "label": "H. influenzae",
            "agents": [
              "Amoxicillin-clavulanate",
              "Cefuroxime",
              "Doxycycline"
            ]
          },
          {
            "id": "moraxella",
            "label": "M. catarrhalis",
            "agents": [
              "Amoxicillin-clavulanate",
              "Cefuroxime"
            ]
          }
        ]
      },
      "Acute Otitis Media": {
        "contextKeywords": [
          "acute otitis media",
          "otitis media"
        ],
        "note": "Common bacterial pathogens are S. pneumoniae, H. influenzae, and M. catarrhalis; age and local recommendations affect management.",
        "pathogens": [
          {
            "id": "spn",
            "label": "S. pneumoniae",
            "agents": [
              "Amoxicillin",
              "Ceftriaxone"
            ]
          },
          {
            "id": "hflu",
            "label": "H. influenzae",
            "agents": [
              "Amoxicillin-clavulanate",
              "Ceftriaxone",
              "Cefuroxime"
            ]
          },
          {
            "id": "moraxella",
            "label": "M. catarrhalis",
            "agents": [
              "Amoxicillin-clavulanate",
              "Cefuroxime"
            ]
          }
        ]
      },
      "Streptococcal Pharyngitis": {
        "contextKeywords": [
          "streptococcal pharyngitis",
          "group A streptococcus",
          "pharyngitis"
        ],
        "note": "Group A Streptococcus is the principal bacterial target; confirm the diagnosis before treatment.",
        "pathogens": [
          {
            "id": "gas",
            "label": "Group A Streptococcus",
            "agents": [
              "Penicillin V",
              "Amoxicillin",
              "Penicillin G",
              "Cephalexin",
              "Azithromycin"
            ]
          }
        ]
      },
      "Syphilis": {
        "contextKeywords": [
          "syphilis",
          "treponema pallidum"
        ],
        "note": "Penicillin formulation and duration depend on stage and neurologic/ocular involvement; do not interchange regimens.",
        "pathogens": [
          {
            "id": "treponema",
            "label": "T. pallidum",
            "agents": [
              "Penicillin G",
              "Doxycycline"
            ]
          }
        ]
      },
      "Neurosyphilis": {
        "contextKeywords": [
          "neurosyphilis",
          "ocular syphilis",
          "otosyphilis"
        ],
        "note": "Requires a CNS-penetrating penicillin regimen; do not substitute routine early-syphilis regimens.",
        "pathogens": [
          {
            "id": "treponema",
            "label": "T. pallidum",
            "agents": [
              "Penicillin G"
            ]
          }
        ]
      },
      "Helicobacter pylori": {
        "contextKeywords": [
          "helicobacter pylori",
          "H. pylori",
          "pylori"
        ],
        "note": "Eradication is combination therapy; clarithromycin-containing regimens depend on susceptibility and local resistance.",
        "pathogens": [
          {
            "id": "hpylori",
            "label": "H. pylori",
            "agents": [
              "Amoxicillin",
              "Clarithromycin",
              "Metronidazole",
              "Tetracycline"
            ]
          }
        ]
      }
    },
    "pathogenDiseaseAgents": {
      "Escherichia coli|cystitis": [
        "Nitrofurantoin",
        "Fosfomycin",
        "Sulfamethoxazole and Trimethoprim",
        "Trimethoprim",
        "Cefalexin"
      ],
      "Escherichia coli|pyelo_sepsis": [
        "Ceftriaxone",
        "Piperacillin-tazobactam",
        "Ertapenem",
        "Meropenem",
        "Ciprofloxacin",
        "Gentamicin"
      ],
      "Escherichia coli|peritonitis": [
        "Piperacillin-tazobactam",
        "Ceftriaxone",
        "Cefepime",
        "Meropenem",
        "Ertapenem",
        "Ciprofloxacin"
      ],
      "Escherichia coli|cholangitis": [
        "Piperacillin-tazobactam",
        "Ceftriaxone",
        "Cefepime",
        "Meropenem",
        "Ciprofloxacin"
      ],
      "Escherichia coli|liver_abscess": [
        "Ceftriaxone",
        "Cefotaxime",
        "Piperacillin-tazobactam",
        "Ertapenem",
        "Meropenem"
      ],
      "Staphylococcus aureus|skin": [
        "Cefazolin",
        "Cloxacillin",
        "Oxacillin",
        "Vancomycin",
        "Doxycycline",
        "Clindamycin",
        "Sulfamethoxazole and Trimethoprim"
      ],
      "Staphylococcus aureus|bacteremia": [
        "Cefazolin",
        "Oxacillin",
        "Nafcillin",
        "Vancomycin",
        "Daptomycin"
      ],
      "Staphylococcus aureus|bone": [
        "Cefazolin",
        "Oxacillin",
        "Vancomycin",
        "Daptomycin",
        "Linezolid"
      ],
      "Staphylococcus aureus|pneumonia": [
        "Vancomycin",
        "Linezolid",
        "Ceftaroline"
      ],
      "Pseudomonas aeruginosa|hap_vap": [
        "Piperacillin-tazobactam",
        "Cefepime",
        "Ceftazidime",
        "Meropenem",
        "Tobramycin"
      ],
      "Pseudomonas aeruginosa|uti": [
        "Cefepime",
        "Ceftazidime",
        "Ciprofloxacin",
        "Levofloxacin",
        "Amikacin"
      ],
      "Pseudomonas aeruginosa|bone_ear": [
        "Ciprofloxacin",
        "Cefepime",
        "Ceftazidime",
        "Piperacillin-tazobactam"
      ],
      "Klebsiella pneumoniae|pneumonia": [
        "Ceftriaxone",
        "Cefepime",
        "Meropenem",
        "Ertapenem"
      ],
      "Klebsiella pneumoniae|uti": [
        "Ceftriaxone",
        "Cefepime",
        "Ertapenem",
        "Meropenem",
        "Ciprofloxacin",
        "Gentamicin"
      ],
      "Klebsiella pneumoniae|liver_abscess": [
        "Ceftriaxone",
        "Cefotaxime",
        "Piperacillin-tazobactam",
        "Ertapenem",
        "Meropenem"
      ],
      "Streptococcus pneumoniae|cap": [
        "Amoxicillin",
        "Ceftriaxone",
        "Levofloxacin",
        "Moxifloxacin"
      ],
      "Streptococcus pneumoniae|meningitis": [
        "Ceftriaxone",
        "Cefotaxime",
        "Vancomycin",
        "Meropenem"
      ],
      "Streptococcus pyogenes|pharyngitis": [
        "Penicillin V",
        "Amoxicillin",
        "Penicillin G",
        "Azithromycin"
      ],
      "Streptococcus pyogenes|skin_nec": [
        "Penicillin G",
        "Clindamycin",
        "Cefazolin",
        "Vancomycin"
      ],
      "Enterococcus faecium|bacteremia_endo": [
        "Ampicillin",
        "Vancomycin",
        "Daptomycin",
        "Linezolid",
        "Gentamicin"
      ],
      "Enterococcus faecium|uti": [
        "Ampicillin",
        "Nitrofurantoin",
        "Fosfomycin",
        "Vancomycin"
      ],
      "Enterococcus faecium|intra_abd": [
        "Ampicillin",
        "Piperacillin-tazobactam",
        "Vancomycin"
      ],
      "Enterococcus faecalis|bacteremia_endo": [
        "Ampicillin",
        "Vancomycin",
        "Daptomycin",
        "Linezolid",
        "Gentamicin"
      ],
      "Enterococcus faecalis|uti": [
        "Ampicillin",
        "Nitrofurantoin",
        "Fosfomycin",
        "Vancomycin"
      ],
      "Enterococcus faecalis|intra_abd": [
        "Ampicillin",
        "Piperacillin-tazobactam",
        "Vancomycin"
      ],
      "Streptococcus pneumoniae|ent": [
        "Amoxicillin",
        "Ceftriaxone",
        "Cefuroxime"
      ],
      "Borrelia burgdorferi|early": [
        "Doxycycline",
        "Amoxicillin",
        "Cefuroxime"
      ],
      "Borrelia burgdorferi|neuro_cardio": [
        "Ceftriaxone",
        "Doxycycline"
      ],
      "Listeria monocytogenes|meningitis": [
        "Ampicillin",
        "Gentamicin",
        "Sulfamethoxazole and Trimethoprim",
        "Meropenem"
      ],
      "Neisseria meningitidis|meningitis": [
        "Ceftriaxone",
        "Cefotaxime",
        "Penicillin G"
      ],
      "Neisseria meningitidis|prophylaxis": [
        "Rifampin",
        "Ciprofloxacin",
        "Ceftriaxone"
      ],
      "Pasteurella multocida|bite_skin": [
        "Amoxicillin-clavulanate",
        "Ampicillin-sulbactam",
        "Doxycycline",
        "Ceftriaxone",
        "Penicillin G"
      ],
      "Pasteurella multocida|bone_joint": [
        "Ceftriaxone",
        "Ampicillin-sulbactam",
        "Piperacillin-tazobactam",
        "Penicillin G",
        "Levofloxacin"
      ],
      "Pasteurella multocida|respiratory": [
        "Ceftriaxone",
        "Amoxicillin",
        "Doxycycline",
        "Levofloxacin",
        "Azithromycin"
      ],
      "Pasteurella multocida|cns_sepsis": [
        "Ceftriaxone",
        "Penicillin G",
        "Meropenem"
      ]
    },
    "directory": {
      "Pathogens": [
        {
          "label": "Staphylococcus aureus (MSSA / MRSA)",
          "query": "Staphylococcus aureus"
        },
        {
          "label": "Escherichia coli",
          "query": "Escherichia coli"
        },
        {
          "label": "Pseudomonas aeruginosa",
          "query": "Pseudomonas aeruginosa"
        },
        {
          "label": "Klebsiella pneumoniae",
          "query": "Klebsiella pneumoniae"
        },
        {
          "label": "Streptococcus pneumoniae",
          "query": "Streptococcus pneumoniae"
        },
        {
          "label": "Streptococcus pyogenes (Group A Strep)",
          "query": "Streptococcus pyogenes"
        },
        {
          "label": "Enterococcus faecium",
          "query": "Enterococcus faecium"
        },
        {
          "label": "Enterococcus faecalis",
          "query": "Enterococcus faecalis"
        }
      ],
      "Syndromes": [
        {
          "label": "Community-Acquired Pneumonia",
          "query": "Community-Acquired Pneumonia"
        },
        {
          "label": "Nosocomial / Ventilator Pneumonia",
          "query": "Nosocomial / Ventilator Pneumonia"
        },
        {
          "label": "Bacterial Meningitis",
          "query": "Bacterial Meningitis"
        },
        {
          "label": "Acute Pyelonephritis",
          "query": "Acute Pyelonephritis"
        },
        {
          "label": "Complicated / Uncomplicated UTI",
          "query": "Complicated / Uncomplicated UTI"
        },
        {
          "label": "Osteomyelitis (Acute / Chronic)",
          "query": "Osteomyelitis (Acute / Chronic)"
        },
        {
          "label": "Intra-Abdominal Infection / Peritonitis",
          "query": "Intra-Abdominal Infection / Peritonitis"
        },
        {
          "label": "Infective Endocarditis",
          "query": "Infective Endocarditis"
        },
        {
          "label": "Cellulitis & Skin Structure",
          "query": "Cellulitis & Skin Structure"
        },
        {
          "label": "Febrile Neutropenia",
          "query": "Febrile Neutropenia"
        }
      ],
      "Drugs & Groups": [
        {
          "label": "Fluoroquinolones (Group)",
          "query": "Fluoroquinolones"
        },
        {
          "label": "Carbapenems (Group)",
          "query": "Carbapenems"
        },
        {
          "label": "Cephalosporins (Group)",
          "query": "Cephalosporins"
        },
        {
          "label": "Penicillins / Beta-Lactams (Group)",
          "query": "Penicillins / Beta-Lactams"
        },
        {
          "label": "Macrolides (Group)",
          "query": "Macrolides"
        },
        {
          "label": "Aminoglycosides (Group)",
          "query": "Aminoglycosides"
        },
        {
          "label": "Meropenem",
          "query": "Meropenem"
        },
        {
          "label": "Vancomycin",
          "query": "Vancomycin"
        },
        {
          "label": "Linezolid",
          "query": "Linezolid"
        },
        {
          "label": "Ceftriaxone",
          "query": "Ceftriaxone"
        }
      ]
    },
    "guidelineCombinations": {
      "Listeria monocytogenes|meningitis": {
        "drugs": [
          "Ampicillin",
          "Gentamicin"
        ],
        "source": "IDSA guideline",
        "sourceUrl": "https://www.idsociety.org/practice-guideline/bacterial-meningitis/",
        "title": "Guideline combination components — Listeria meningitis",
        "note": "Ampicillin is the treatment backbone; any adjunctive gentamicin requires specialist assessment of benefit and renal toxicity. These cards are components, not monotherapy alternatives."
      },
      "Streptococcus pyogenes|skin_nec": {
        "drugs": [
          "Penicillin G",
          "Clindamycin"
        ],
        "source": "CDC guideline",
        "sourceUrl": "https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/necrotizing-fasciitis.html",
        "title": "First-line combination for documented GAS necrotizing fasciitis",
        "note": "Penicillin G plus clindamycin applies to documented group A streptococcal necrotizing fasciitis, alongside urgent surgical management. This is not a general cellulitis regimen."
      },
      "Streptococcus pneumoniae|meningitis": {
        "drugs": [
          "Ceftriaxone",
          "Vancomycin"
        ],
        "source": "IDSA guideline",
        "sourceUrl": "https://www.idsociety.org/practice-guideline/bacterial-meningitis/",
        "title": "Empiric combination components — pneumococcal meningitis",
        "note": "Ceftriaxone plus vancomycin is an empiric combination pending susceptibility results; age, local resistance and adjunctive therapy require separate assessment."
      }
    },
    "guidelineOptions": {
      "Pasteurella multocida|bite_skin": {
        "source": "IDSA guideline",
        "sourceUrl": "https://www.idsociety.org/practice-guideline/skin-and-soft-tissue/",
        "note": "Infected animal bites may be polymicrobial. Oral amoxicillin/clavulanate or IV ampicillin/sulbactam are guideline options; route depends on severity and ability to take oral treatment. These are alternatives, not a required combination.",
        "options": [
          {
            "agent": "Amoxicillin-clavulanate",
            "route": {
              "$regex": "oral|\\bpo\\b",
              "$flags": "i"
            },
            "title": "First-line oral option — infected animal bite"
          },
          {
            "agent": "Ampicillin-sulbactam",
            "route": {
              "$regex": "intravenous|\\biv\\b",
              "$flags": "i"
            },
            "title": "First-line IV option — infected animal bite"
          }
        ]
      },
      "Chlamydia trachomatis|uncomplicated": {
        "source": "CDC guideline",
        "sourceUrl": "https://www.cdc.gov/std/treatment-guidelines/chlamydia.htm",
        "note": "Doxycycline is a recommended option for uncomplicated chlamydial infection in nonpregnant adults. This grouping does not cover pregnancy, neonatal infection or other complications.",
        "nonpregnantAdultsOnly": true,
        "options": [
          {
            "agent": "Doxycycline",
            "route": {
              "$regex": "oral|\\bpo\\b",
              "$flags": "i"
            },
            "title": "Preferred oral option — uncomplicated chlamydia"
          }
        ]
      }
    },
    "legacyRenalProfiles": {
      "MEROPENEM": {
        "adjustedDose": "500 mg – 1 g IV every 12 hours (if CrCl 10–25 mL/min); 500 mg IV every 24 hours (if CrCl < 10 mL/min)",
        "contraLevel": "RELATIVE CAUTION",
        "contraNote": "Accumulation risk: Unadjusted doses in eGFR < 30 increase risk of beta-lactam neurotoxicity and seizures."
      },
      "IMIPENEM": {
        "adjustedDose": "250 mg – 500 mg IV every 8–12 hours (if CrCl 15–29 mL/min)",
        "contraLevel": "RELATIVE CONTRAINDICATION",
        "contraNote": "High CNS Seizure Risk in eGFR < 30 (especially if CrCl < 15 mL/min or CNS lesions); prefer Meropenem."
      },
      "ERTAPENEM": {
        "adjustedDose": "500 mg IV/IM every 24 hours (50% dose reduction when CrCl < 30 mL/min)",
        "contraLevel": "DOSE REDUCTION MANDATORY",
        "contraNote": "Renally cleared: Must reduce standard 1 g daily dose to 500 mg daily when eGFR < 30 mL/min."
      },
      "CEFEPIME": {
        "adjustedDose": "1 g IV every 12 hours (or 2 g IV every 24 hours for severe/febrile neutropenia if CrCl 11–29 mL/min)",
        "contraLevel": "HIGH NEUROTOXICITY RISK",
        "contraNote": "Relative Contraindication if unadjusted: Crosses blood-brain barrier in renal failure causing encephalopathy, myoclonus, and non-convulsive status epilepticus."
      },
      "CEFTRIAXONE": {
        "adjustedDose": "1 g – 2 g IV every 24 hours (NO renal dose adjustment required; dual hepatic/biliary + renal excretion)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Safe in eGFR < 30 without dose reduction (cap maximum daily dose at 2 g/day in combined hepatorenal failure)."
      },
      "CEFAZOLIN": {
        "adjustedDose": "500 mg – 1 g IV every 12 hours (if CrCl 11–34 mL/min); 500 mg every 24h (if CrCl <= 10 mL/min)",
        "contraLevel": "DOSE ADJUSTMENT REQUIRED",
        "contraNote": "Primarily excreted unchanged in urine; extend interval to Q12H–Q24H when eGFR < 30."
      },
      "PIPERACILLIN": {
        "adjustedDose": "2.25 g IV every 6 hours (or 3.375 g IV every 8 hours for nosocomial pneumonia if CrCl 20–40 mL/min; every 8–12h if CrCl < 20)",
        "contraLevel": "NEPHROTOXIC SYNERGY ALERT",
        "contraNote": "High risk of Acute Kidney Injury (AKI) if co-administered with Vancomycin; adjust maintenance dose for CrCl < 40 mL/min."
      },
      "AMOXICILLIN": {
        "adjustedDose": "500 mg PO/IV every 12 hours (if eGFR 10–30 mL/min); 500 mg every 24 hours (if eGFR < 10 mL/min)",
        "contraLevel": "DOSE ADJUSTMENT REQUIRED",
        "contraNote": "Avoid 875 mg high-dose tablets in eGFR < 30; extend interval to Q12H to prevent crystalluria."
      },
      "AMPICILLIN": {
        "adjustedDose": "1 g – 2 g IV every 8–12 hours (if CrCl 10–30 mL/min)",
        "contraLevel": "DOSE ADJUSTMENT REQUIRED",
        "contraNote": "Extend dosing interval in eGFR < 30 mL/min."
      },
      "PENICILLIN": {
        "adjustedDose": "Reduce maintenance dose by 25–50% or extend interval to every 6–8 hours when CrCl < 30 mL/min",
        "contraLevel": "DOSE ADJUSTMENT REQUIRED",
        "contraNote": "High-dose IV Penicillin G in renal failure causes CNS neurotoxicity/seizures and electrolyte load."
      },
      "CLOXACILLIN": {
        "adjustedDose": "500 mg – 2 g IV/PO every 6 hours (NO routine renal dose adjustment required; dual hepatic + renal clearance)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Cleared substantially via hepatic metabolism and biliary excretion; standard dosing maintained in eGFR < 30."
      },
      "OXACILLIN": {
        "adjustedDose": "1 g – 2 g IV every 4–6 hours (NO routine renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Hepatobiliary elimination predominates; no dose reduction needed in renal impairment."
      },
      "NAFCILLIN": {
        "adjustedDose": "1 g – 2 g IV every 4–6 hours (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Cleared primarily by hepatic/biliary route; safe in eGFR < 30 without dose reduction."
      },
      "DICLOXACILLIN": {
        "adjustedDose": "250 mg – 500 mg PO every 6 hours (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Hepatic and renal excretion; no dosage adjustment needed in renal insufficiency."
      },
      "VANCOMYCIN": {
        "adjustedDose": "Loading dose 20–25 mg/kg IV x1, then maintenance dosed strictly by Therapeutic Drug Monitoring (TDM / AUC 400–600)",
        "contraLevel": "RELATIVE CONTRAINDICATION / NEPHROTOXIC",
        "contraNote": "Direct proximal tubular nephrotoxicity. Mandatory serum level monitoring in eGFR < 30."
      },
      "GENTAMICIN": {
        "adjustedDose": "Avoid routine use if possible; if essential, give single loading dose (3–5 mg/kg) and redose ONLY by serum trough (<1 mcg/mL)",
        "contraLevel": "STRONG RELATIVE CONTRAINDICATION",
        "contraNote": "High risk of irreversible vestibulocochlear ototoxicity and acute tubular necrosis (ATN) in eGFR < 30 mL/min."
      },
      "AMIKACIN": {
        "adjustedDose": "Initial loading dose 12–15 mg/kg IV, then extend interval (Q24–48H) strictly guided by serum drug levels",
        "contraLevel": "STRONG RELATIVE CONTRAINDICATION",
        "contraNote": "Potent nephrotoxin and auditory ototoxin; avoid in eGFR < 30 unless no safer Gram-negative alternative exists."
      },
      "PLAZOMICIN": {
        "adjustedDose": "10 mg/kg IV every 24 hours (if CrCl 30–59); 10 mg/kg IV every 48 hours (if CrCl 15–29 mL/min)",
        "contraLevel": "STRONG RELATIVE CONTRAINDICATION",
        "contraNote": "Aminoglycoside nephrotoxicity and ototoxicity; monitor trough levels and CrCl closely."
      },
      "AMPHOTERICIN B": {
        "adjustedDose": "Prefer Liposomal formulation (3–5 mg/kg IV daily); pre-hydrate with 500 mL 0.9% NaCl and monitor K+ / Mg2+ daily",
        "contraLevel": "HIGH NEPHROTOXICITY CONTRAINDICATION",
        "contraNote": "Causes afferent arteriolar vasoconstriction, distal renal tubular acidosis (RTA), and K+/Mg2+ wasting."
      },
      "ANIDULAFUNGIN": {
        "adjustedDose": "200 mg IV loading dose on Day 1, then 100 mg IV daily (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (NO ADJUSTMENT)",
        "contraNote": "Cleared by non-enzymatic chemical degradation; 100% safe in severe renal failure."
      },
      "LINEZOLID": {
        "adjustedDose": "600 mg IV/PO every 12 hours (NO primary renal dose adjustment, but monitor platelets closely)",
        "contraLevel": "METABOLITE ACCUMULATION CAUTION",
        "contraNote": "Two primary oxidation metabolites accumulate 7-to-8-fold in eGFR < 30, increasing risk of thrombocytopenia."
      },
      "DAPTOMYCIN": {
        "adjustedDose": "4–6 mg/kg IV every 48 hours (extend interval from Q24H to Q48H when CrCl < 30 mL/min)",
        "contraLevel": "MANDATORY INTERVAL EXTENSION (Q48H)",
        "contraNote": "Must extend dosing to every 48 hours in CrCl < 30 mL/min and monitor CPK twice weekly."
      },
      "CIPROFLOXACIN": {
        "adjustedDose": "250–500 mg PO every 12–18 hours OR 200–400 mg IV every 18–24 hours (if CrCl < 30 mL/min)",
        "contraLevel": "DOSE REDUCTION (50%) REQUIRED",
        "contraNote": "50–70% excreted renally; reduce dose or extend interval in eGFR < 30."
      },
      "LEVOFLOXACIN": {
        "adjustedDose": "750 mg initial dose, then 500 mg every 48 hours (if CrCl 20–49); OR 500 mg initial, then 250 mg every 48 hours (if CrCl 10–19)",
        "contraLevel": "MANDATORY Q48H INTERVAL EXTENSION",
        "contraNote": "Substantially excreted unchanged in urine; requires Q48H maintenance frequency when eGFR < 30."
      },
      "MOXIFLOXACIN": {
        "adjustedDose": "400 mg PO/IV every 24 hours (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (DO NOT USE FOR UTI)",
        "contraNote": "Hepatic/biliary clearance requires no renal dose adjustment, but achieves poor urinary concentrations."
      },
      "GATIFLOXACIN": {
        "adjustedDose": "400 mg initial dose, then 200 mg every 24 hours when CrCl < 40 mL/min",
        "contraLevel": "DOSE REDUCTION (50%) & DYSLYCEMIA RISK",
        "contraNote": "Renally cleared fluoroquinolone; high risk of severe hypoglycemia/hyperglycemia in renal insufficiency."
      },
      "DOXYCYCLINE": {
        "adjustedDose": "100 mg PO/IV every 12 hours (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE TETRACYCLINE",
        "contraNote": "Excreted via GI tract chelation (unlike other tetracyclines); safe in eGFR < 30."
      },
      "TETRACYCLINE": {
        "adjustedDose": "AVOID in eGFR < 30 mL/min (Substitute Doxycycline)",
        "contraLevel": "ABSOLUTE/STRONG CONTRAINDICATION",
        "contraNote": "Anti-anabolic effect markedly increases BUN, hyperphosphatemia, and acidosis in renal impairment."
      },
      "NITROFURANTOIN": {
        "adjustedDose": "CONTRAINDICATED when eGFR < 30 mL/min",
        "contraLevel": "ABSOLUTE CONTRAINDICATION (eGFR < 30)",
        "contraNote": "Fails to reach therapeutic urinary concentrations in eGFR < 30 while systemic accumulation causes neuropathy and pulmonary toxicity."
      },
      "SULFAMETHOXAZOLE": {
        "adjustedDose": "Reduce dose by 50% (if CrCl 15–30 mL/min); AVOID if CrCl < 15 mL/min",
        "contraLevel": "CONTRAINDICATED IF CrCl < 15 / HYPERKALEMIA RISK",
        "contraNote": "Trimethoprim blocks ENaC channels in collecting duct, causing hyperkalemia and crystalluria in eGFR < 30."
      },
      "CLARITHROMYCIN": {
        "adjustedDose": "250 mg PO twice daily (or 500 mg once daily) — 50% dose reduction required when CrCl < 30 mL/min",
        "contraLevel": "50% DOSE REDUCTION REQUIRED",
        "contraNote": "Renal clearance drops sharply below CrCl 30 mL/min, increasing QTc prolongation risk."
      },
      "AZITHROMYCIN": {
        "adjustedDose": "500 mg Day 1, then 250 mg–500 mg daily (NO routine renal dose adjustment)",
        "contraLevel": "RENAL SAFE (BILIARY CLEARANCE)",
        "contraNote": "Primarily biliary excretion; no dosage adjustment needed in mild-to-moderate renal failure."
      },
      "CLINDAMYCIN": {
        "adjustedDose": "600 mg – 900 mg IV every 8 hours or 300–450 mg PO QID (NO renal dose adjustment required)",
        "contraLevel": "RENAL SAFE (HEPATIC CLEARANCE)",
        "contraNote": "Hepatically metabolized with minimal renal excretion (<10%); safe in eGFR < 30."
      }
    },
    "legacyRenalModerate": {
      "LEVOFLOXACIN": [
        "amber",
        "CrCl 20–49: dose adjustment required (FDA label).",
        49
      ],
      "CIPROFLOXACIN": [
        "amber",
        "CrCl 30–50: reduced oral dosing range per FDA label; adjust IV accordingly.",
        50
      ],
      "CEFEPIME": [
        "amber",
        "CrCl 30–60: dose reduction required (FDA label); neurotoxicity risk if unadjusted.",
        59
      ],
      "MEROPENEM": [
        "amber",
        "CrCl 26–50: recommended dose given q12h (FDA label).",
        50
      ],
      "IMIPENEM": [
        "amber",
        "Dose reduction per FDA label table when CrCl <90; seizure risk.",
        89
      ],
      "PIPERACILLIN": [
        "amber",
        "CrCl 20–40: reduced dose per FDA label; AKI risk with vancomycin.",
        40
      ],
      "NITROFURANTOIN": [
        "red",
        "FDA label lists CrCl <60 as a contraindication (guidelines tolerate ≥30 — clinical judgment).",
        59
      ],
      "VANCOMYCIN": [
        "amber",
        "Dose by AUC/trough TDM; nephrotoxic.",
        59
      ],
      "GENTAMICIN": [
        "amber",
        "TDM-guided dosing; nephro-/ototoxic.",
        59
      ],
      "AMIKACIN": [
        "amber",
        "TDM-guided dosing; nephro-/ototoxic.",
        59
      ],
      "TOBRAMYCIN": [
        "amber",
        "TDM-guided dosing; nephro-/ototoxic.",
        59
      ],
      "SULFAMETHOXAZOLE": [
        "emerald",
        "No adjustment at CrCl >30 mL/min (FDA label); monitor K⁺ and creatinine.",
        59
      ],
      "ERTAPENEM": [
        "emerald",
        "No adjustment at CrCl >30 mL/min (FDA label).",
        59
      ],
      "DAPTOMYCIN": [
        "emerald",
        "No adjustment at CrCl ≥30 mL/min (FDA label).",
        59
      ]
    },
    "legacyHemodialysisNotes": {
      "DAPTOMYCIN": "q48h; give after dialysis on HD days (FDA label).",
      "LINEZOLID": "give after hemodialysis (FDA label).",
      "CIPROFLOXACIN": "give after dialysis on HD days (FDA label).",
      "LEVOFLOXACIN": "no supplemental dose after HD (FDA label).",
      "PIPERACILLIN": "label adds a supplemental dose after each dialysis session.",
      "MEROPENEM": "dialyzable — give the dose after dialysis.",
      "CEFAZOLIN": "dialyzable — give after HD.",
      "VANCOMYCIN": "dose by pre-HD level; high-flux membranes remove drug.",
      "GENTAMICIN": "dialyzable — redose after each session guided by pre-dialysis levels.",
      "AMIKACIN": "dialyzable — redose after each session guided by pre-dialysis levels.",
      "TOBRAMYCIN": "dialyzable — redose after each session guided by pre-dialysis levels."
    },
    "alternativeRoutes": {
      "LINEZOLID": "PO (≈100% bioavailable)",
      "LEVOFLOXACIN": "PO (high bioavailability)",
      "CIPROFLOXACIN": "PO (good bioavailability)",
      "MOXIFLOXACIN": "PO (high bioavailability)",
      "DOXYCYCLINE": "PO (high bioavailability)",
      "METRONIDAZOLE": "PO (≈100%)",
      "FLUCONAZOLE": "PO (>90%)",
      "VORICONAZOLE": "PO (>90%)",
      "SULFAMETHOXAZOLE": "PO (≈90–100%)",
      "CLINDAMYCIN": "PO or IM",
      "AZITHROMYCIN": "PO",
      "RIFAMPIN": "PO",
      "ERTAPENEM": "IM",
      "CEFTRIAXONE": "IM",
      "CEFAZOLIN": "IM",
      "CEFOTAXIME": "IM",
      "CEFTAZIDIME": "IM",
      "CEFEPIME": "IM (mild–moderate infections only, per label)",
      "AMPICILLIN": "IM",
      "GENTAMICIN": "IM",
      "AMIKACIN": "IM",
      "TOBRAMYCIN": "IM",
      "AZTREONAM": "IM"
    },
    "resistanceStopWords": [
      "acute",
      "complicated",
      "uncomplicated",
      "infection",
      "bacterial",
      "community",
      "acquired",
      "skin",
      "structure",
      "pneumonia",
      "diabetic",
      "foot",
      "pelvic",
      "inflammatory",
      "disease",
      "febrile",
      "neutropenia"
    ],
    "euOnlyAgents": {
      "teicoplanin": [
        "Teicoplanin",
        [
          "Vancomycin"
        ],
        "glycopeptide"
      ],
      "targocid": [
        "Teicoplanin",
        [
          "Vancomycin"
        ],
        "glycopeptide"
      ],
      "flucloxacillin": [
        "Flucloxacillin",
        [
          "Cloxacillin",
          "Dicloxacillin",
          "Oxacillin"
        ],
        "anti-staphylococcal penicillin"
      ],
      "floxacillin": [
        "Flucloxacillin",
        [
          "Cloxacillin",
          "Dicloxacillin",
          "Oxacillin"
        ],
        "anti-staphylococcal penicillin"
      ],
      "temocillin": [
        "Temocillin",
        [],
        ""
      ],
      "pristinamycin": [
        "Pristinamycin",
        [],
        ""
      ],
      "pyostacine": [
        "Pristinamycin",
        [],
        ""
      ]
    },
    "legacySourceRegistry": {
      "dailymed": {
        "label": "NIH DailyMed",
        "hosts": [
          "dailymed.nlm.nih.gov"
        ]
      },
      "nih dailymed": {
        "label": "NIH DailyMed",
        "hosts": [
          "dailymed.nlm.nih.gov"
        ]
      },
      "cdc": {
        "label": "CDC guideline",
        "hosts": [
          "cdc.gov"
        ]
      },
      "nice": {
        "label": "NICE guideline",
        "hosts": [
          "nice.org.uk"
        ]
      },
      "ema": {
        "label": "EMA product information",
        "hosts": [
          "ema.europa.eu"
        ]
      },
      "who": {
        "label": "WHO guidance",
        "hosts": [
          "who.int"
        ]
      },
      "idsa": {
        "label": "IDSA guideline",
        "hosts": [
          "idsociety.org"
        ]
      }
    },
    "resistanceSurveillance": [
      {
        "id": "ecoli",
        "pathogen": "Escherichia coli",
        "gram": "gn",
        "priority": "WHO Critical Priority",
        "clinicalSyndromes": "UTI, Pyelonephritis, Intra-Abdominal Sepsis, Bacteremia",
        "pmcQuery": "Escherichia coli ESBL resistance prevalence surveillance",
        "livePapersCount": null,
        "drugs": [
          {
            "antibiotic": "Aminopenicillins (Ampicillin / Amoxicillin)",
            "mechanism": "TEM-1 / SHV-1 Beta-Lactamase",
            "rates": {
              "eu": 53.4,
              "ce": 51.8,
              "us": 48.2,
              "global": 62
            },
            "trend5Yr": "+1.2%",
            "direction": "stable",
            "history": [
              52.2,
              52.8,
              53,
              53.1,
              53.4
            ]
          },
          {
            "antibiotic": "Fluoroquinolones (Ciprofloxacin)",
            "mechanism": "gyrA / parC Topoisomerase Mutations",
            "rates": {
              "eu": 22.6,
              "ce": 20.4,
              "us": 21.1,
              "global": 34.5
            },
            "trend5Yr": "+2.8%",
            "direction": "up",
            "history": [
              19.8,
              20.5,
              21.3,
              22,
              22.6
            ]
          },
          {
            "antibiotic": "3rd-Gen Cephalosporins (Ceftriaxone - ESBL)",
            "mechanism": "CTX-M-15 ESBL",
            "rates": {
              "eu": 15.1,
              "ce": 13.8,
              "us": 16.4,
              "global": 28
            },
            "trend5Yr": "+2.4%",
            "direction": "up",
            "history": [
              12.7,
              13.4,
              14,
              14.6,
              15.1
            ]
          },
          {
            "antibiotic": "Carbapenems (Meropenem)",
            "mechanism": "OXA-48 / NDM Carbapenemases",
            "rates": {
              "eu": 0.3,
              "ce": 0.2,
              "us": 0.6,
              "global": 2.1
            },
            "trend5Yr": "+0.1%",
            "direction": "stable",
            "history": [
              0.2,
              0.2,
              0.2,
              0.3,
              0.3
            ]
          }
        ]
      },
      {
        "id": "kleb",
        "pathogen": "Klebsiella pneumoniae",
        "gram": "gn",
        "priority": "WHO Critical Priority",
        "clinicalSyndromes": "HAP/VAP, Complicated UTI, Hepatobiliary Sepsis",
        "pmcQuery": "Klebsiella pneumoniae carbapenem resistance surveillance",
        "livePapersCount": null,
        "drugs": [
          {
            "antibiotic": "3rd-Gen Cephalosporins (Ceftriaxone - ESBL)",
            "mechanism": "CTX-M / SHV Plasmids",
            "rates": {
              "eu": 34.3,
              "ce": 31.5,
              "us": 24.8,
              "global": 43.2
            },
            "trend5Yr": "+3.9%",
            "direction": "up",
            "history": [
              30.4,
              31.8,
              32.9,
              33.7,
              34.3
            ]
          },
          {
            "antibiotic": "Carbapenems (Meropenem / Ertapenem - CRKP)",
            "mechanism": "KPC / OXA-48 / NDM-1",
            "rates": {
              "eu": 11.7,
              "ce": 4.8,
              "us": 5.4,
              "global": 18.5
            },
            "trend5Yr": "+4.6%",
            "direction": "up",
            "history": [
              7.1,
              8.4,
              9.6,
              10.8,
              11.7
            ]
          }
        ]
      },
      {
        "id": "pseudo",
        "pathogen": "Pseudomonas aeruginosa",
        "gram": "gn",
        "priority": "WHO High Priority",
        "clinicalSyndromes": "Ventilator Pneumonia (VAP), Neutropenic Sepsis",
        "pmcQuery": "Pseudomonas aeruginosa carbapenem resistance surveillance",
        "livePapersCount": null,
        "drugs": [
          {
            "antibiotic": "Piperacillin / Tazobactam",
            "mechanism": "AmpC Derepression + Efflux",
            "rates": {
              "eu": 13.8,
              "ce": 12.9,
              "us": 11.5,
              "global": 19.4
            },
            "trend5Yr": "+1.9%",
            "direction": "up",
            "history": [
              11.9,
              12.4,
              12.9,
              13.4,
              13.8
            ]
          },
          {
            "antibiotic": "Carbapenems (Meropenem / Imipenem)",
            "mechanism": "OprD Porin Loss + VIM/IMP",
            "rates": {
              "eu": 18.6,
              "ce": 15.2,
              "us": 14,
              "global": 24.2
            },
            "trend5Yr": "+2.1%",
            "direction": "up",
            "history": [
              16.5,
              17.1,
              17.8,
              18.2,
              18.6
            ]
          }
        ]
      },
      {
        "id": "mrsa",
        "pathogen": "Staphylococcus aureus",
        "gram": "gp",
        "priority": "WHO High Priority",
        "clinicalSyndromes": "Cellulitis, Osteomyelitis, Endocarditis, Bacteremia",
        "pmcQuery": "MRSA Staphylococcus aureus resistance surveillance",
        "livePapersCount": null,
        "drugs": [
          {
            "antibiotic": "Oxacillin / Flucloxacillin (MRSA Rate)",
            "mechanism": "mecA PBP2a Alteration",
            "rates": {
              "eu": 15.2,
              "ce": 11.4,
              "us": 38.5,
              "global": 31
            },
            "trend5Yr": "-2.7%",
            "direction": "down",
            "history": [
              17.9,
              17.1,
              16.3,
              15.8,
              15.2
            ]
          },
          {
            "antibiotic": "Vancomycin",
            "mechanism": "vanA Glycopeptide Resistance",
            "rates": {
              "eu": 0.1,
              "ce": 0.1,
              "us": 0.2,
              "global": 0.3
            },
            "trend5Yr": "0.0%",
            "direction": "stable",
            "history": [
              0.1,
              0.1,
              0.1,
              0.1,
              0.1
            ]
          }
        ]
      },
      {
        "id": "vre",
        "pathogen": "Enterococcus faecium",
        "gram": "gp",
        "priority": "WHO High Priority",
        "clinicalSyndromes": "Catheter Bacteremia, Intra-Abdominal Infection",
        "pmcQuery": "Enterococcus faecium vancomycin resistance VRE surveillance",
        "livePapersCount": null,
        "drugs": [
          {
            "antibiotic": "Vancomycin (VRE Rate)",
            "mechanism": "vanA / vanB D-Ala-D-Lac Shift",
            "rates": {
              "eu": 19.8,
              "ce": 24.5,
              "us": 68,
              "global": 29.5
            },
            "trend5Yr": "+4.9%",
            "direction": "up",
            "history": [
              14.9,
              16.2,
              17.6,
              18.9,
              19.8
            ]
          },
          {
            "antibiotic": "Linezolid",
            "mechanism": "23S rRNA G2576T / optrA",
            "rates": {
              "eu": 1.4,
              "ce": 1.2,
              "us": 1.8,
              "global": 2.1
            },
            "trend5Yr": "+0.5%",
            "direction": "up",
            "history": [
              0.9,
              1,
              1.1,
              1.3,
              1.4
            ]
          }
        ]
      }
    ],
    "legacyPediatricTemplates": {
      "CEFTRIAXONE": {
        "template": "50–75 mg/kg/day = {v1}–{v2} mg/day (max 2 g/day), once daily or split q12h; meningitis 100 mg/kg/day = {v3} mg/day (max 4 g/day) split q12h",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              50,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  75,
                  {
                    "field": "weight"
                  }
                ]
              },
              2000
            ]
          },
          "v3": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  100,
                  {
                    "field": "weight"
                  }
                ]
              },
              4000
            ]
          }
        }
      },
      "CEFAZOLIN": {
        "template": "25–50 mg/kg/day = {v1}–{v2} mg/day in 3–4 doses; severe infection up to 100 mg/kg/day = {v3} mg/day",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              25,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "multiply",
            "args": [
              50,
              {
                "field": "weight"
              }
            ]
          },
          "v3": {
            "op": "multiply",
            "args": [
              100,
              {
                "field": "weight"
              }
            ]
          }
        }
      },
      "VANCOMYCIN": {
        "template": "10 mg/kg IV q6h = {v1} mg/dose; adjust by AUC/trough TDM",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              10,
              {
                "field": "weight"
              }
            ]
          }
        }
      },
      "GENTAMICIN": {
        "template": "6–7.5 mg/kg/day = {v1}–{v2} mg/day in 3 divided doses; TDM",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              6,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "multiply",
            "args": [
              7.5,
              {
                "field": "weight"
              }
            ]
          }
        }
      },
      "LINEZOLID": {
        "cases": [
          {
            "when": {
              "field": "age",
              "lt": 12
            },
            "template": "<12 y: 10 mg/kg q8h = {v1} mg/dose (max 600 mg)",
            "calculations": {
              "v1": {
                "op": "min",
                "args": [
                  {
                    "op": "multiply",
                    "args": [
                      10,
                      {
                        "field": "weight"
                      }
                    ]
                  },
                  600
                ]
              }
            }
          },
          {
            "template": "≥12 y: 600 mg q12h",
            "calculations": {}
          }
        ]
      },
      "MEROPENEM": {
        "template": "q8h: skin 10 mg/kg = {v1} mg (max 500 mg); intra-abdominal 20 mg/kg = {v2} mg (max 1 g); meningitis 40 mg/kg = {v3} mg (max 2 g); >50 kg use adult dosing",
        "calculations": {
          "v1": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  10,
                  {
                    "field": "weight"
                  }
                ]
              },
              500
            ]
          },
          "v2": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  20,
                  {
                    "field": "weight"
                  }
                ]
              },
              1000
            ]
          },
          "v3": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  40,
                  {
                    "field": "weight"
                  }
                ]
              },
              2000
            ]
          }
        }
      },
      "AZITHROMYCIN": {
        "template": "CAP: 10 mg/kg = {v1} mg day 1 (max 500), then 5 mg/kg = {v2} mg days 2–5 (max 250)",
        "calculations": {
          "v1": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  10,
                  {
                    "field": "weight"
                  }
                ]
              },
              500
            ]
          },
          "v2": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  5,
                  {
                    "field": "weight"
                  }
                ]
              },
              250
            ]
          }
        }
      },
      "AMOXICILLIN": {
        "template": "<40 kg: 25 mg/kg/day q12h or 20 mg/kg/day q8h (= {v1} / {v2} mg/day); severe: 45 mg/kg/day q12h or 40 mg/kg/day q8h (= {v3} / {v4} mg/day)",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              25,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "multiply",
            "args": [
              20,
              {
                "field": "weight"
              }
            ]
          },
          "v3": {
            "op": "multiply",
            "args": [
              45,
              {
                "field": "weight"
              }
            ]
          },
          "v4": {
            "op": "multiply",
            "args": [
              40,
              {
                "field": "weight"
              }
            ]
          }
        }
      },
      "CLINDAMYCIN": {
        "template": "IV 20–40 mg/kg/day = {v1}–{v2} mg/day in 3–4 doses; oral 8–20 mg/kg/day = {v3}–{v4} mg/day",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              20,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "multiply",
            "args": [
              40,
              {
                "field": "weight"
              }
            ]
          },
          "v3": {
            "op": "multiply",
            "args": [
              8,
              {
                "field": "weight"
              }
            ]
          },
          "v4": {
            "op": "multiply",
            "args": [
              20,
              {
                "field": "weight"
              }
            ]
          }
        }
      },
      "FLUCONAZOLE": {
        "template": "systemic candidiasis 6–12 mg/kg/day = {v1}–{v2} mg/day (max 600 mg)",
        "calculations": {
          "v1": {
            "op": "multiply",
            "args": [
              6,
              {
                "field": "weight"
              }
            ]
          },
          "v2": {
            "op": "min",
            "args": [
              {
                "op": "multiply",
                "args": [
                  12,
                  {
                    "field": "weight"
                  }
                ]
              },
              600
            ]
          }
        }
      },
      "DOXYCYCLINE": {
        "template": "≤45 kg (≥8 y only): 4.4 mg/kg/day in 2 doses on day 1, then 2.2–4.4 mg/kg/day",
        "calculations": {}
      }
    },
    "resistanceSettings": {
      "regions": {
        "eu": "EU/EEA illustrative benchmark",
        "ce": "Central Europe illustrative benchmark",
        "us": "North America illustrative benchmark",
        "global": "Global illustrative benchmark"
      },
      "gramFilters": {
        "all": "All bacteria",
        "gn": "Gram negative",
        "gp": "Gram positive"
      },
      "mediumThreshold": 10,
      "highThreshold": 25,
      "defaultPaperQuery": "antimicrobial resistance surveillance"
    },
    "patientAlertRules": [],
    "riskBadgeRules": []
  },
  "lexicons": {
    "wordingEquivalents": [
      [
        {
          "$regex": "\\ballegric\\b",
          "$flags": "g"
        },
        "allergic"
      ],
      [
        {
          "$regex": "\\ballergic reactions?\\b",
          "$flags": "g"
        },
        "hypersensitivity reaction"
      ],
      [
        {
          "$regex": "\\b(?:allergy|allergies|allergic)\\b",
          "$flags": "g"
        },
        "hypersensitivity"
      ],
      [
        {
          "$regex": "\\bhypersensitivity reactions?\\b",
          "$flags": "g"
        },
        "hypersensitivity"
      ],
      [
        {
          "$regex": "\\banaphylactic reactions?\\b",
          "$flags": "g"
        },
        "anaphylaxis"
      ],
      [
        {
          "$regex": "\\bhaemodialysis\\b",
          "$flags": "g"
        },
        "hemodialysis"
      ],
      [
        {
          "$regex": "\\bhaemofiltration\\b",
          "$flags": "g"
        },
        "hemofiltration"
      ],
      [
        {
          "$regex": "\\bhaemodiafiltration\\b",
          "$flags": "g"
        },
        "hemodiafiltration"
      ],
      [
        {
          "$regex": "\\bpaediatric\\b",
          "$flags": "g"
        },
        "pediatric"
      ],
      [
        {
          "$regex": "\\bbacteraemia\\b",
          "$flags": "g"
        },
        "bacteremia"
      ],
      [
        {
          "$regex": "\\bsepticaemia\\b",
          "$flags": "g"
        },
        "septicemia"
      ],
      [
        {
          "$regex": "\\bgonorrhoea\\b",
          "$flags": "g"
        },
        "gonorrhea"
      ],
      [
        {
          "$regex": "\\bdiarrhoea\\b",
          "$flags": "g"
        },
        "diarrhea"
      ],
      [
        {
          "$regex": "\\boesophageal\\b",
          "$flags": "g"
        },
        "esophageal"
      ],
      [
        {
          "$regex": "\\boesophagitis\\b",
          "$flags": "g"
        },
        "esophagitis"
      ],
      [
        {
          "$regex": "\\banaemia\\b",
          "$flags": "g"
        },
        "anemia"
      ],
      [
        {
          "$regex": "\\boedema\\b",
          "$flags": "g"
        },
        "edema"
      ],
      [
        {
          "$regex": "\\bfoetal\\b",
          "$flags": "g"
        },
        "fetal"
      ],
      [
        {
          "$regex": "\\blabour\\b",
          "$flags": "g"
        },
        "labor"
      ],
      [
        {
          "$regex": "\\bbreast[- ]feeding\\b",
          "$flags": "g"
        },
        "breastfeeding"
      ],
      [
        {
          "$regex": "\\blivers?\\b",
          "$flags": "g"
        },
        "hepatic"
      ],
      [
        {
          "$regex": "\\bkidneys?\\b",
          "$flags": "g"
        },
        "renal"
      ],
      [
        {
          "$regex": "\\bimpaired (hepatic|renal) function\\b",
          "$flags": "g"
        },
        "$1 impairment"
      ],
      [
        {
          "$regex": "\\b(hepatic|renal) (?:functional impairment|insufficiency)\\b",
          "$flags": "g"
        },
        "$1 impairment"
      ],
      [
        {
          "$regex": "\\b(hepatic|renal) function impairment\\b",
          "$flags": "g"
        },
        "$1 impairment"
      ],
      [
        {
          "$regex": "\\bchild\\s*[-–]?\\s*pugh\\b",
          "$flags": "g"
        },
        "child-pugh"
      ],
      [
        {
          "$regex": "\\bblood[- ]stream\\b",
          "$flags": "g"
        },
        "bloodstream"
      ],
      [
        {
          "$regex": "\\b(?:hospital[- ]acquired|nosocomial) pneumonia\\b",
          "$flags": "g"
        },
        "hospital acquired pneumonia"
      ],
      [
        {
          "$regex": "\\bventilator[- ](?:associated|acquired) pneumonia\\b",
          "$flags": "g"
        },
        "ventilator associated pneumonia"
      ],
      [
        {
          "$regex": "\\bcommunity[- ]acquired pneumonia\\b",
          "$flags": "g"
        },
        "community acquired pneumonia"
      ],
      [
        {
          "$regex": "\\bpharyngo[- ]?tonsillitis\\b",
          "$flags": "g"
        },
        "pharyngotonsillitis"
      ],
      [
        {
          "$regex": "\\b(?:streptococcal sore throat|strep throat)\\b",
          "$flags": "g"
        },
        "streptococcal pharyngitis"
      ],
      [
        {
          "$regex": "\\bintra[- ]abdominal\\b",
          "$flags": "g"
        },
        "intra abdominal"
      ],
      [
        {
          "$regex": "\\b(?:skin and skin[- ]structure|skin[- ]structure) infections?\\b",
          "$flags": "g"
        },
        "skin and soft tissue infection"
      ],
      [
        {
          "$regex": "\\bsoft[- ]tissue\\b",
          "$flags": "g"
        },
        "soft tissue"
      ],
      [
        {
          "$regex": "\\b(?:peri[- ]operative|perioperative)\\b",
          "$flags": "g"
        },
        "perioperative"
      ],
      [
        {
          "$regex": "\\bpre[- ](?:op|operative)\\b",
          "$flags": "g"
        },
        "preoperative"
      ],
      [
        {
          "$regex": "\\bintra[- ](?:op|operative)\\b",
          "$flags": "g"
        },
        "intraoperative"
      ],
      [
        {
          "$regex": "\\bpost[- ](?:op|operative)\\b",
          "$flags": "g"
        },
        "postoperative"
      ],
      [
        {
          "$regex": "\\b(?:by mouth|per os|orally)\\b",
          "$flags": "g"
        },
        "oral"
      ],
      [
        {
          "$regex": "\\bintravenously\\b",
          "$flags": "g"
        },
        "intravenous"
      ],
      [
        {
          "$regex": "\\bintramuscularly\\b",
          "$flags": "g"
        },
        "intramuscular"
      ],
      [
        {
          "$regex": "\\bsubcutaneously\\b",
          "$flags": "g"
        },
        "subcutaneous"
      ],
      [
        {
          "$regex": "\\b(?:serum drug concentration monitoring|serum level monitoring)\\b",
          "$flags": "g"
        },
        "therapeutic drug monitoring"
      ],
      [
        {
          "$regex": "\\b(?:not to exceed|do not exceed)\\b",
          "$flags": "g"
        },
        "not to exceed"
      ],
      [
        {
          "$regex": "\\bfebrile neutropenic patients?\\b",
          "$flags": "g"
        },
        "febrile neutropenia"
      ],
      [
        {
          "$regex": "\\binfections\\b",
          "$flags": "g"
        },
        "infection"
      ]
    ],
    "retrievalExpansions": [
      {
        "triggers": [
          "hypersensitivity"
        ],
        "add": [
          "anaphylaxis",
          "anaphylactic shock",
          "anaphylactoid reaction"
        ]
      },
      {
        "triggers": [
          "anaphylaxis"
        ],
        "add": [
          "anaphylactic shock"
        ]
      },
      {
        "triggers": [
          "renal"
        ],
        "add": [
          "nephrotoxicity",
          "nephrotoxic"
        ]
      },
      {
        "triggers": [
          "hepatic"
        ],
        "add": [
          "hepatotoxicity",
          "hepatotoxic"
        ]
      },
      {
        "triggers": [
          "pregnancy"
        ],
        "add": [
          "pregnant",
          "gestation"
        ]
      },
      {
        "triggers": [
          "breastfeeding"
        ],
        "add": [
          "lactation",
          "nursing mothers"
        ]
      }
    ],
    "contextSynonyms": {
      "bacteremia": [
        "bacteraemia"
      ],
      "osteomyelitis": [
        "bone infection"
      ],
      "pharyngitis": [
        "pharyngotonsillitis"
      ],
      "gonorrhea": [
        "gonorrhoea"
      ],
      "diarrhea": [
        "diarrhoea"
      ]
    },
    "contextAliases": [
      {
        "triggers": [
          "strep throat",
          "streptococcal pharyngitis"
        ],
        "add": [
          "pharyngitis"
        ]
      },
      {
        "triggers": [
          "pharyngotonsillitis"
        ],
        "add": [
          "pharyngitis",
          "tonsillitis"
        ]
      },
      {
        "triggers": [
          "acute otitis media"
        ],
        "add": [
          "otitis media"
        ]
      },
      {
        "triggers": [
          "acute bacterial sinusitis"
        ],
        "add": [
          "sinusitis"
        ]
      },
      {
        "triggers": [
          "complicated intra abdominal infection"
        ],
        "add": [
          "intra abdominal infection"
        ]
      },
      {
        "triggers": [
          "blood stream infection"
        ],
        "add": [
          "bloodstream infection"
        ]
      },
      {
        "triggers": [
          "bone infection"
        ],
        "add": [
          "osteomyelitis"
        ]
      },
      {
        "triggers": [
          "osteomyelitis"
        ],
        "add": [
          "bone infection"
        ]
      },
      {
        "triggers": [
          "septic arthritis"
        ],
        "add": [
          "infectious arthritis"
        ]
      },
      {
        "triggers": [
          "infectious arthritis"
        ],
        "add": [
          "septic arthritis"
        ]
      },
      {
        "triggers": [
          "lung infection"
        ],
        "add": [
          "pulmonary infection"
        ]
      },
      {
        "triggers": [
          "pulmonary infection"
        ],
        "add": [
          "lung infection"
        ]
      },
      {
        "triggers": [
          "oral candidiasis"
        ],
        "add": [
          "oropharyngeal candidiasis",
          "oral thrush"
        ]
      },
      {
        "triggers": [
          "oral thrush"
        ],
        "add": [
          "oral candidiasis",
          "oropharyngeal candidiasis"
        ]
      },
      {
        "triggers": [
          "neutropenic fever"
        ],
        "add": [
          "febrile neutropenia"
        ]
      },
      {
        "triggers": [
          "febrile neutropenia"
        ],
        "add": [
          "neutropenic fever"
        ]
      }
    ],
    "abbreviations": {
      "uti": "urinary tract infection",
      "cuti": "complicated urinary tract infection",
      "uuti": "uncomplicated urinary tract infection",
      "iai": "intra abdominal infection",
      "ciai": "complicated intra abdominal infection",
      "cap": "community acquired pneumonia",
      "hap": "hospital acquired pneumonia",
      "vap": "ventilator associated pneumonia",
      "habp": "hospital acquired bacterial pneumonia",
      "vabp": "ventilator associated bacterial pneumonia",
      "aom": "acute otitis media",
      "ssti": "skin and soft tissue infection",
      "csssi": "complicated skin and soft tissue infection",
      "absssi": "acute bacterial skin and soft tissue infection",
      "pid": "pelvic inflammatory disease",
      "cdi": "clostridioides difficile infection",
      "cdad": "clostridium difficile associated diarrhea",
      "pjp": "pneumocystis jirovecii pneumonia",
      "pcp": "pneumocystis pneumonia"
    },
    "indicationTerms": [
      "pneumonia",
      "bronchitis",
      "sinusitis",
      "otitis",
      "pharyngitis",
      "tonsillitis",
      "throat",
      "skin",
      "cellulitis",
      "erysipelas",
      "abscess",
      "fasciitis",
      "impetigo",
      "urinary tract",
      "cystitis",
      "pyelonephritis",
      "prostatitis",
      "urethritis",
      "cervicitis",
      "gonorrhea",
      "gonococcal",
      "chlamydia",
      "genital ulcer",
      "chancroid",
      "syphilis",
      "pelvic inflammatory",
      "endocarditis",
      "meningitis",
      "bacteremia",
      "septicemia",
      "sepsis",
      "osteomyelitis",
      "bone",
      "joint",
      "arthritis",
      "intra abdominal",
      "peritonitis",
      "mycobacterium avium",
      "anthrax",
      "plague",
      "lyme",
      "cholera",
      "pertussis",
      "legionnaires",
      "prophylaxis",
      "rheumatic fever",
      "febrile neutropenia",
      "acne",
      "lower respiratory",
      "upper respiratory",
      "respiratory tract",
      "genitourinary",
      "nose",
      "diarrhea",
      "pylori",
      "tuberculosis",
      "epididymitis",
      "conjunctivitis",
      "dental",
      "periodontitis",
      "endometritis",
      "cholecystitis",
      "cholangitis",
      "diverticulitis",
      "appendicitis",
      "empyema",
      "mastoiditis"
    ]
  }
};
