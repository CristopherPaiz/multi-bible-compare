import { useContext } from "react";
import LanguageContext from "../context/LanguageContext";

const About = () => {
  const COLLABORATORS = {
    Beblia: "https://github.com/Beblia/Holy-Bible-XML-Format",
    "Amplified (2015)": "English Amplified - Copyright © 2015 by The Lockman Foundation, La Habra, CA 90631. All rights reserved.",
    "American Standard Version [ASV] (1901)": "ASV Domain",
    "Christian Standard Bible [CSB] (2017)": "Copyright © 2017 by Holman Bible Publishers. Used by permission.",
    "Darby (1890)": "English Darby 1890 : Public Domain",
    "Easy to Read Version [ERV] (2006)": "Copyright © 2006 by Bible League International",
    "English Standard Version [ESV] (2016)": "The Holy Bible, English Standard Version. ESV® Text Edition: 2016. Copyright © 2001 by Crossway Bibles",
    "God's Word [GW] (1995)": "© 1995 God's Word Translation",
    "Holman Christian Standard Bible [HCSB] (2004)": "Copyright 2004 Holman Bible Publishers",
    "King James Version [KJV] (1611)": "English KJV Domain",
    "New American Standard Bible [NASB] (1971)": "English NASB Domain",
    "New American Standard Bible Updated [NASU] (1989)": "Copyright © The Lockman Foundation 1999-2015. All rights reserved",
    "New English Translation [NET] (2005)": "NET Bible copyright © 1996-2006 by Biblical Studies Press",
    "New International Reader's Version [NIRV] (1996)":
      "Copyright © 1995, 1996, 1998, 2014 by Biblica, Inc.®. Used by permission. All rights reserved worldwide.",
    "New International Version [NIV] (1978)": "English NIV Domain",
    "New King James [NKJ] (1982)": "Enlglish NKJ Domain",
    "New Living Translation [NLT] (1996)": "English NLT Domain",
    "New Revised Standard Version [NRSV] (1989)":
      "Copyright © 1989 the Division of Christian Education of the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved.",
    "English Tyndale (1537)": "Public Domain",
    "Young's Literal Translation [YLT] (1898)": "English (YLT) 1898 Young's Literal Translation by Robert Young public domain",
    "Esperanto Bible 1926 (ESP)": "Public Domain",
    "Stephanus NT (1550)": "Public Domain 1550",
    "Neophytos Vamvas Translation (1770)": "Greek - Neophytos Vamvas Translation - 1770 Good Accurate Translation Public Domain",
    "BYZ04 (1904)": "Copyrighted by the Hellenic Bible Society, 2017. https://www.bible.com/bible/209/LUK.13.BYZ04",
    "BYZ18 (2018)": "This compilation is Copyright © 2018 by Maurice A. Robinson https://www.bible.com/bible/3449/LUK.13.BYZ18",
    "Elzevir (1624)": "Public Domain",
    "F35 (1453)": "Public Domain https://www.bible.com/bible/3130/LUK.13.F35",
    "FPB (1993)": "Pergamos Publications, 23, AVEROF STREET, 104 33 ATHENS, GREECE https://www.bible.com/bible/921/ROM.13.FPB",
    "GNT (1904)": "Greek GNT 1904 : Public Domain",
    "LMGNT (1994)":
      "Modern Greek New Testament (LMGNT) Copyright ©1994, 2004, 2021 by LOGOS, AMG International. Published by You Version Bible App. All Rights Reserved. Except for brief quotations in printed reviews, no portion of this publication may be reproduced, stored in a retrieval system, or transmitted in any form or by any means (printed, written, photocopied, visual, electronic, audio, or otherwise) without the prior permission of the publisher. https://www.bible.com/bible/3669/EPH.3.LMGNT",
    "Modern Bible (1904)": "Greek Modern Bible 1904 : Public Domain",
    "Modern Bible FPB (1994)": "Copyright © The Holy Bible, Spyros Filos Translation, copyright 1994",
    "NTV (1967)": "Copyrighted by the Hellenic Bible Society, 1967. https://www.bible.com/bible/423/EPH.3.NTV",
    "SBLGNT (2010)": "Copyright © 2010 by Society of Biblical Literature and Logos Bible Software",
    "TCGNT (2005)": "Public Domain https://www.bible.com/bible/3428/TIT.2.TCGNT",
    "TGV (1997)": "Copyrighted by the Hellenic Bible Society, 1997, 2003. https://www.bible.com/bible/173/DEU.17.TGV",
    "THGNT (2018)": "https://www.thegreeknewtestament.com/ & https://www.bible.com/bible/2270/1CO.8.THGNT",
    "TR (1894)": "Public Domain https://www.bible.com/bible/183/1CO.8.TR1894",
    EnglishAmplifiedBible: "name='English Amplified - Copyright © 2015 by The Lockman Foundation, La Habra, CA 90631. All rights reserved.'",
    EnglishASVBible: "translation='English ASV'",
    EnglishCSBBible:
      "translation='English CSB 2017 - Christian Standard Bible', status='Copyright © 2017 by Holman Bible Publishers. Used by permission.'",
    EnglishDarbyBible: "translation='English Darby 1890 : Public Domain'",
    EnglishERVBible: "translation='English ERV 2006 - Only For Website', Status='Copyright © 2006 by Bible League International'",
    EnglishESVBible:
      "translation='English ESV 2016 == The Holy Bible, English Standard Version. ESV® Text Edition: 2016. Copyright © 2001 by Crossway Bibles'",
    EnglishGWBible: "translation='English God's Word - GW 1995', status='© 1995 God's Word Translation'",
    EnglishHCSBBible: "translation='English HCSB 2004 - Copyrighted Only For Website', Status='Copyright 2004 Holman Bible Publishers'",
    EnglishKJBible: "translation='English KJV'",
    EnglishNASBBible: "translation='English NASB'",
    EnglishNASUBible:
      "translation='English NASU 1989 - New American Standard Update - Only for Website', Status='Copyright © The Lockman Foundation 1999-2015. All rights reserved'",
    EnglishNETBible: "translation='English NET Bible - 2005 (New English Translation)', info='NET Bible copyright © 1996-2006 by Biblical Studies Press'",
    EnglishNIRVBible:
      "translation='English NIRV 1996 - Copyrighted only for Website', Status='Copyright © 1995, 1996, 1998, 2014 by Biblica, Inc.®. Used by permission. All rights reserved worldwide.'",
    EnglishNIVBible: "translation='English NIV'",
    EnglishNKJBible: "translation='Enlglish NKJ'",
    EnglishNLTBible: "translation='English NLT'",
    EnglishNRSVBible:
      "translation='English NRSV 1989 - Only for website', Status='Copyright © 1989 the Division of Christian Education of the National Council of the Churches of Christ in the United States of America. Used by permission. All rights reserved.'",
    EnglishTyndale1537Bible: "translation='English Tyndale 1537', info='Public Domain'",
    EnglishYLTBible: "translation='English (YLT) 1898 Young's Literal Translation by Robert Young', info='Public Domain'",
    EsperantoBible: "translation='Esperanto Bible 1926 (ESP)', status='Public Domain'",
    Greek1550Bible: "translation='Greek Stephanus NT 1550', info='Public Domain 1550'",
    GreekBible: "name='Greek - Neophytos Vamvas Translation - 1770 Good Accurate Translation'",
    GreekBYZ04Bible:
      "language='Greek BYZ04 (Πατριαρχικό Κείμενο (Έκδοση Αντωνιάδη, 1904))', staus='Copyrighted by the Hellenic Bible Society, 2017.', link='https://www.bible.com/bible/209/LUK.13.BYZ04'",
    GreekBYZ18Bible:
      "language='Greek BYZ18 (Byzantine Textform 2018)', staus='This compilation is Copyright © 2018 by Maurice A. Robinson', link='https://www.bible.com/bible/3449/LUK.13.BYZ18'",
    GreekElzevirBible: "translation='Greek Elzevir 1624', info='Public Domain'",
    GreekF35Bible:
      "language='Greek F35 (Η Ελληνική Καινή Διαθήκη Σύμφωνα με την Οικογένεια 35)', staus='PUBLIC DOMAIN', link='https://www.bible.com/bible/3130/LUK.13.F35'",
    GreekFPBBible:
      "language='Greek FPB (H Αγία Γραφή στη Δημοτική (Filos Pergamos))', staus='Pergamos Publications, 23, AVEROF STREET, 104 33 ATHENS, GREECE', link='https://www.bible.com/bible/921/ROM.13.FPB'",
    GreekGNTBible: "name='Greek GNT 1904 : Public Domain'",
    GreekLMGNTBible:
      "language='Greek LMGNT (Νεοελληνική Μετάφραση Λόγου)', staus='Modern Greek New Testament (LMGNT) Copyright ©1994, 2004, 2021 by LOGOS, AMG International. Published by You Version Bible App. All Rights Reserved. Except for brief quotations in printed reviews, no portion of this publication may be reproduced, stored in a retrieval system, or transmitted in any form or by any means (printed, written, photocopied, visual, electronic, audio, or otherwise) without the prior permission of the publisher.', link='https://www.bible.com/bible/3669/EPH.3.LMGNT'",
    GreekModern1904Bible: "name='Greek Modern Bible 1904 : Public Domain'",
    GreekModernFPBBible: "name='Greek Modern Bible : FPB 1994 -- Copyright © The Holy Bible, Spyros Filos Translation, copyright 1994'",
    GreekNTVBible:
      "language='Greek NTV (Η Καινή Διαθήκη του Κυρίου και Σωτήρος ημών Ιησού Χριστού κατά νεοελληνικήν απόδοσιν)', staus='Copyrighted by the Hellenic Bible Society, 1967.', link='https://www.bible.com/bible/423/EPH.3.NTV'",
    GreekSBLGNTBible: "translation='Greek SBLGNT 2010', info='Copyright © 2010 by Society of Biblical Literature and Logos Bible Software'",
    GreekTCGNTBible:
      "language='Greek TCGNT (Text-Critical Greek New Testament)', staus='Public Domain', link='https://www.bible.com/bible/3428/TIT.2.TCGNT'",
    GreekTGVBible:
      "language='Greek TGV (Η Αγία Γραφή (Παλαιά και Καινή Διαθήκη))', staus='Copyrighted by the Hellenic Bible Society, 1997, 2003.', link='https://www.bible.com/bible/173/DEU.17.TGV'",
    GreekTHGNTBible:
      "language='Greek THGNT (The Greek New Testament)', staus='https://www.thegreeknewtestament.com/', link='https://www.bible.com/bible/2270/1CO.8.THGNT'",
    GreekTR1894Bible:
      "language='Greek TR1894 (Scrivener’s Textus Receptus 1894)', staus='Public Domain', link='https://www.bible.com/bible/183/1CO.8.TR1894'",
    Hebrew1885Bible: "translation='Hebrew Bible (DHNT) 1885 - Delitzsch's Hebrew New Testament', status='Public Domain'",
    HebrewAleppoCodexBible: "translation='Hebrew Aleppo Codex Bible', info='Public Domain'",
    HebrewBible: "translation='Hebrew Bible Modern 1977', info='Public Domain'",
    HebrewBSIBible:
      "language='Hebrew BSI (שעתוק אלקטרוני נאמן לכתב יד לנינגרד)', staus='Hebrew Old Testament BSI with Cross References Copyright © 2017 The Bible Society in Israel Jerusalem, Israel. All Rights Reserved. www.haktuvim.com', link='https://www.bible.com/bible/2376/GEN.1.'",
    HebrewHHHBible:
      "translation='Hebrew Bible (HHH) 2009', status='Habrit Hakhadasha/Haderekh “The Way” (Hebrew Living New Testament) Copyright © 1979, 2009 by Biblica, Inc.®'",
    HebrewLeningradCodexBible:
      "translation='Hebrew Leningrad Codex - Only for Website', info='The Westminster Leningrad Codex (version 4.20) == Copyright (C) 1991-2016 by The J. Alan Groves Center for Advanced Biblical Research'",
    HebrewMHBBible:
      "translation='Hebrew Bible (MHB) 2010', info='Israeli Hebrew, Modern Israeli Hebrew compilation from Westmister (OT) and Modern Hebrew(NT).'",
    HebrewMHNT2020Bible:
      "language='Hebrew MHNT2020 (הברית החדשה בעברית מודרנית)', staus='הברית החדשה בעברית מודרנית כל הזכויות שמורות © 1976, 2020 החברה לכתבי הקודש בישראל ת״ד 44, ירושלים 9100001', link='https://www.bible.com/bible/380/JHN.13_1.MHNT2020'",
    HebrewTDBible:
      "language='Hebrew TD (תנ'ך וברית חדשה בתרגום דליטש)', staus='Tanach and Delitzsch's Hebrew New Testament © Bible Society in Israel, 2018. כל הזכויות שמורות לחברה לכתבי הקודש בישראל', link='https://www.bible.com/bible/2220/DEU.6.תנ״ך%20ודליטש'",
    Kiche1995Bible:
      "translation='Kiche 1995 (Quiché Bible)', status='Biblia Quiché © Sociedades Bíblicas Unidas, 1995.', link='https://www.bible.com/bible/490/GEN.13.QUICH1'",
    Kiche2022Bible:
      "translation='Kiche (RI KꞌAKꞌ TESTAMENTO PA TZIJOBꞌAL KꞌICHEꞌ)', status='© Pioneer Bible Translators, 2022 CC-BY Esta licencia Creative Commons permite la redistribución, comercial y no comercial, pero usted debe dar crédito de manera adecuada, brindar un enlace a la licencia, e indicar si se han realizado cambios. Puede hacerlo en cualquier forma razonable, pero no de forma tal que sugiera que usted o su uso tienen el apoyo de la licenciante. Favor de enviar cualquier consulta respecto a esta licencia a Pioneer Bible Translators por medio de su página web pioneerbible.org Esta obra está licenciada bajo la Licencia Creative Commons Atribución 4.0 Internacional. Para ver una copia de esta licencia, visite http://creativecommons.org/licenses/by/4.0/ o envíe una carta a: Creative Commons PO Box 1866 Mountain View, CA 94042 USA', link='https://www.bible.com/bible/3557/MAT.1.K’ICHE’'",
    KicheBible: "translation='Kiche 1997 Version (IBS)', status='1997 Wycliffe Bible Translators == Can use need to reference'",
    KicheQUCNBible:
      "translation='Kiche QUCN (New Orthography)', status='© 2011, Wycliffe Bible Translators, Inc. All rights reserved.', link='https://www.bible.com/bible/657/MAT.1.QUCN'",
    LatinBible: "translation='Latin - Vulgate Version', status='Public Domain: Year 405'",
    LatinClementina1914Bible: "translation='Latin - Vulgata Clementina Hetzenauer Editore 1914', status='Public Domain'",
    LatinClementineBible: "translation='Latin - Clementine Vulgata 1598', status='Public Domain: 1598'",
    LatinNovaVulgataBible: "translation='Latin - Nova Vulgata 1979', status='Public Domain: Nova Vulgata 1979'",
    LatinSistinaBible: "translation='Latin - Vulgata Sistina', status='Public Domain: Latin Vulgata Sistina'",
    Nahuatl2012Bible:
      "translation='Nahuatl (Zacatlán, Ahuacatlán, Tepetzintla)', status='© 2012, Wycliffe Bible Translators, Inc. All rights reserved.', link='https://www.bible.com/bible/366/MAT.7.NHI'",
    Nahuatl2017Bible:
      "translation='Nahuatl 2017 (El Nuevo Testamento)', status='© 2017, Wycliffe Bible Translators, Inc. All rights reserved.', link='https://www.bible.com/bible/1725/MAT.7.NSUNT'",
    NahuatlBible: "translation='Nahuatl 1987', status='Copyrighted - Copyright © 1987 by La Liga Biblica'",
    NahuatlNHEBible:
      "translation='Nahuatl NHE (Nahuatl, Eastern Huasteca)', status='© 1985, 2005 Wycliffe Bible Translators, Inc. All rights reserved.', link='https://www.bible.com/bible/747/EXO.8.NHE'",
    QeqchiBible: "name='Qeqchi - Can find anything', status='Public Domain'",
    Spanish1569Bible: "translation='Spanish 1569', status='Public Domain'",
    Spanish1858Bible: "translation='Spanish Reina Valera NT 1858', info='Public Domain 1858'",
    Spanish1989Bible: "translation='Spanish 1989', status='Reina Valera Actualizada, © 1982, 1986, 1987, 1989 usada conpermiso'",
    SpanishBDOBible:
      "translation='Spanish BDO 1973', status='Biblia del Oso 1973 Public Domain. Edición Digital © Sociedades Biblicas Unidas, 2000.', link='https://www.bible.com/bible/1715/GEN.1.BDO1573'",
    SpanishBible: "translation='Spanish Reina Valera 1909'",
    SpanishBLPBible:
      "translation='Spanish BLP (La Palabra (versión española))', status='La Palabra (BLP) versión española Copyright © Sociedad Bíblica de España, 2010 Utilizada con permiso', link='https://www.bible.com/bible/210/GEN.2.BLP'",
    SpanishBTIBible:
      "translation='Spanish BTI (La Biblia, Traducción Interconfesional (versión española))', status='La Biblia, Traducción Interconfesional (BTI) versión española Copyright © Sociedad Bíblica de España, 2008 Utilizada con permiso', link='https://www.bible.com/bible/214/LEV.7.BTI'",
    SpanishBTXBible:
      "translation='Spanish La Biblia Textual (BTX) Biblia Hebraica Stuttgartensia 1999', info='© 1999 por la Sociedad Bíblica Iberoamericana Todos los derechos reservados Derechos internacionales registrados'",
    SpanishDHHBible: "translation='Spanish DHH 1996', info='Dios habla hoy ®, © Sociedades Bíblicas Unidas, 1966, 1970, 1979, 1983, 1996'",
    SpanishLBLABible: "translation='Spanish Bible LBLB (La Biblia De Las Américas) 1997', info='Copyright © 1986, 1995, 1997 by The Lockman Foundation'",
    SpanishNVIBible:
      "translation='Spanish NVI Bible - Nueva Versión Internacional', info='Copyright © 1999, 2015 by Biblica, Inc.® All rights reserved worldwide'",
    SpanishRevisedRVR1960Bible:
      "translation='Spanish Reina-Valera RVR 1960 (Revised Reina Valera 1960)', info='Versión Reina-Valera 1960 © Sociedades Bíblicas en América Latina, 1960. Renovado © Sociedades Bíblicas Unidas, 1988'",
    SpanishRV2020Bible:
      "translation='Spanish RV2020 (Reina Valera 2020)', status='© Sociedad Bíblica de España Antigua versión de Casiodoro de Reina (1569), revisada por Cipriano de Valera (1602). Revisiones anteriores con la participación de Sociedad Bíblica de España: 1862, 1909, 1960 y 1995. ', link='https://www.bible.com/bible/3425/GEN.2.RV2020'",
    SpanishRVGBible: "translation='Spanish Bible RVG - Reina Valera Gómez 2004', info='Copytight Allowed To Use - Reina Valera Gómez 2004'",
    SpanishRVR1960Bible:
      "translation='Spanish Reina Valera 1960', info='Versión Reina-Valera 1960 © Sociedades Bíblicas en América Latina, 1960. Renovado © Sociedades Bíblicas Unidas, 1988'",
    SpanishRVR1995Bible: "translation='Spanish Reina-Valera 1995 (RVR1995)', info='Copyright © 1995 by United Bible Societies'",
    SpanishTLABible: "translation='Spanish TLA 2000 (Has Verse Errors Needs Fix)', info='Copyright © 2000 by United Bible Societies'",
    SpanishVBLBible:
      "translationumber='Spanish Version Is Called = Free Bible Version or (Versión Biblia Libre = VBL) - Public Domain - http://www.freebibleversion.org/ - Copyright © 2018 Jonathan Gallagher y Shelly Barrios de Avila'",
  };
  const { t } = useContext(LanguageContext);
  return (
    <div className="w-full overflow-hidden">
      <article className="animate-fade-in px-6 py-3 justify-center w-[99%] sm:w-[700px] m-auto">
        <h1 className="text-2xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("SobreProyecto")} </h1>
        <p className="mt-4 dark:text-white text-center text-sm sm:text-balance sm:text-center">
          {t("InfoSobreProyecto")}:
          <br />
          <a
            href="https://github.com/CristopherPaiz"
            target="_blank"
            style={{ fontWeight: "700", fontSize: 20 }}
            className="text-emerald-500 dark:text-emerald-400 flex flex-row gap-1 items-center justify-center mt-3"
          >
            {t("CristopherPaiz")}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
              <path d="M11 13l9 -9" />
              <path d="M15 4h5v5" />
            </svg>
          </a>
        </p>

        <p className="mt-4 dark:text-white text-left text-sm sm:text-balance sm:text-center">
          {t("InfoSobreProyectoDos")}{" "}
          <a href="https://github.com/CristopherPaiz/multi-bible-compare" className="text-blue-500 dark:text-blue-400" target="_blank">
            Multi Bible Compare.
          </a>{" "}
          {t("InfoSobreProyectoTres")}
        </p>
        <p className="mt-4 dark:text-white text-left text-sm sm:text-balance sm:text-center">{t("MasInfoSobreProyeto")}</p>
        <div className="w-11/12 m-auto px-4 py-6 bg-orange-500/50 rounded-lg overflow-hidden mt-5">
          <h2 className="text-center text-xl font-bold mb-2 text-black dark:text-white">DISCLAIMER</h2>
          <h3 className="text-black dark:text-white text-justify text-[11px]">{t("DisclaimerBiblia")}</h3>
        </div>
        <h2 className="text-2xl text-center mt-10 dark:text-white font-bold">{t("Colaboradores")}</h2>
        <ul className="mt-4 dark:text-white text-center text-sm">
          {Object.keys(COLLABORATORS).map((collaborator) => (
            <li key={collaborator}>
              <strong className="font-black">{collaborator}:</strong> <br />
              {COLLABORATORS[collaborator]}
              <br />
              <br />
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
};

export default About;
