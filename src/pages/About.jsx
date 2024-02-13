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
    "New International Reader's Version [NIRV] (1996)": "Copyright © 1995, 1996, 1998, 2014 by Biblica, Inc.®. Used by permission. All rights reserved worldwide.",
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
    "FALTAN MÁS LICENCIAS": "...",
    "...": "...",
  };
  const { t } = useContext(LanguageContext);
  return (
    <>
      <article className="px-6 py-3 justify-center w-full sm:w-[700px] m-auto">
        <h1 className="text-2xl font-bold flex justify-center text-center mt-7 dark:text-white">{t("SobreProyecto")}</h1>
        <p className="mt-4 dark:text-white text-left text-balance text-sm">{t("InfoSobreProyecto")}</p>
        <br />
        <p className="mt-4 dark:text-white text-left text-balance text-sm">{t("MasInfoSobreProyeto")}</p>
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
    </>
  );
};

export default About;
