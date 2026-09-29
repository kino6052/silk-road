import type { Culture } from './types';

/** Splits a space-separated list of names; no name contains a space. */
const list = (names: string): readonly string[] => names.split(' ');

const EIDS = ['ramadan', 'eid-al-fitr', 'eid-al-adha'] as const;

/**
 * Cultural groups of the corridor: main language, majority religion, festivals and common
 * names for people born around 1950–2010. Patronymic cultures use the surnames found in
 * passports (often a father's or grandfather's given name).
 */
export const CULTURES: readonly Culture[] = [
  {
    id: 'han',
    language: 'zh',
    religion: 'folk-none',
    festivals: ['spring-festival'],
    nameOrder: 'family-first',
    givenNames: {
      female: list(
        'Xiuying Guilan Yulan Shuzhen Hong Yan Jing Min Ting Xiaohong Lili Yuxin Zihan Xinyi Yutong',
      ),
      male: list(
        'Jianguo Jianhua Guoqiang Wei Lei Yong Jun Tao Ming Hao Chao Bo Haoran Zihao Yuxuan',
      ),
    },
    familyNames: list(
      'Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo He Lin Gao Luo',
    ),
  },
  {
    id: 'uyghur',
    language: 'ug',
    religion: 'sunni',
    festivals: ['nowruz', ...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Aygul Gulnar Mahire Patigul Rahile Zulfiye Mihray Nurgul Dilnur Aynur Gulzar Mayinur Buhelchem Reyhangul',
      ),
      male: list(
        'Abdukerim Alim Ekber Ablimit Nurmemet Yusup Erkin Dilshat Ilyar Kurban Adil Parhat Mehmut Muhemmet',
      ),
    },
    familyNames: list(
      'Tursun Abdulla Memet Hesen Rozi Qadir Niyaz Osman Yasin Ismayil Ehmet Hoshur Abliz',
    ),
  },
  {
    id: 'kazakh',
    language: 'kk',
    religion: 'sunni',
    festivals: ['nowruz', 'eid-al-fitr', 'eid-al-adha'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Aigerim Aizhan Gulnara Dinara Saule Zhanar Asel Madina Aruzhan Gulmira Akmaral Zarina Ainur Botagoz',
      ),
      male: list(
        'Nurlan Yerlan Daniyar Askar Serik Bolat Marat Arman Yerzhan Aidos Timur Alikhan Dauren Kairat',
      ),
    },
    familyNames: list(
      'Akhmetov Omarov Suleimenov Zhakupov Iskakov Tulegenov Kassymov Baimukhanov Sarsenbayev Abdrakhmanov Zhumabayev Nurpeisov',
    ),
    familyNamesFemale: list(
      'Akhmetova Omarova Suleimenova Zhakupova Iskakova Tulegenova Kassymova Baimukhanova Sarsenbayeva Abdrakhmanova Zhumabayeva Nurpeisova',
    ),
  },
  {
    id: 'hui',
    language: 'zh',
    religion: 'sunni',
    festivals: ['spring-festival', ...EIDS],
    nameOrder: 'family-first',
    givenNames: {
      female: list('Xiulan Fenglan Yuhua Haiyan Jing Xia Juan Ling Xue Meiying Suying Fang Yuemei'),
      male: list(
        'Wenhua Zhongliang Yongfu Xueming Guoqing Haibo Liang Bin Jinbao Yousheng Zhiqiang Hao Chengde',
      ),
    },
    familyNames: list('Ma Bai Ding Ha Hai Na Sa Mu Sha Mi Yang Hu Jin Lan'),
  },
  {
    id: 'tibetan',
    language: 'bo',
    religion: 'buddhist',
    festivals: ['losar'],
    nameOrder: 'family-first',
    givenNames: {
      female: list(
        'Dolma Lhamo Yangchen Dolkar Pelmo Yangzom Choedon Dekyi Lhadon Metok Tsomo Wangmo',
      ),
      male: list(
        'Dorje Norbu Phuntsok Wangdu Gyaltsen Jigme Lobsang Namgyal Tsewang Thupten Rinchen Kalsang',
      ),
    },
    // Tibetans rarely have family names; the common first element of a two-part name stands in.
    familyNames: list(
      'Tenzin Tashi Tsering Sonam Dawa Pema Nyima Karma Ngawang Kunga Lhakpa Pasang',
    ),
  },
  {
    id: 'russian',
    language: 'ru',
    religion: 'orthodox',
    festivals: ['orthodox-christmas', 'orthodox-easter'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Tatyana Yelena Natalya Olga Irina Svetlana Anna Mariya Yekaterina Anastasiya Lyudmila Galina Darya Yuliya',
      ),
      male: list(
        'Aleksandr Sergey Dmitry Andrey Aleksey Vladimir Nikolay Mikhail Ivan Yevgeny Maksim Artyom Igor Viktor',
      ),
    },
    familyNames: list(
      'Ivanov Smirnov Kuznetsov Popov Vasilyev Petrov Sokolov Mikhaylov Novikov Fyodorov Morozov Volkov Lebedev Kozlov',
    ),
    familyNamesFemale: list(
      'Ivanova Smirnova Kuznetsova Popova Vasilyeva Petrova Sokolova Mikhaylova Novikova Fyodorova Morozova Volkova Lebedeva Kozlova',
    ),
  },
  {
    id: 'tatar',
    language: 'tt',
    religion: 'sunni',
    festivals: ['eid-al-fitr', 'eid-al-adha'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Alsu Gulnara Liliya Dilyara Elvira Alina Guzel Rezeda Leysan Chulpan Zulfiya Aliya Albina Ilsiyar',
      ),
      male: list(
        'Rustam Ildar Rinat Airat Ilnur Damir Ruslan Azat Rafael Almaz Timur Radik Bulat Ilgiz',
      ),
    },
    familyNames: list(
      'Akhmetzyanov Minnullin Gilmanov Khairullin Sabirov Shakirov Nigmatullin Zakirov Garipov Mingazov Fattakhov Gainutdinov',
    ),
    familyNamesFemale: list(
      'Akhmetzyanova Minnullina Gilmanova Khairullina Sabirova Shakirova Nigmatullina Zakirova Garipova Mingazova Fattakhova Gainutdinova',
    ),
  },
  {
    id: 'uzbek',
    language: 'uz',
    religion: 'sunni',
    festivals: ['nowruz', ...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Dilnoza Gulnora Nilufar Shahnoza Madina Malika Feruza Zarina Dilfuza Mohira Sevara Kamola Nodira Umida',
      ),
      male: list(
        'Bakhodir Jasur Sardor Rustam Otabek Bobur Aziz Sherzod Ulugbek Farrukh Jamshid Akmal Shukhrat Dilshod',
      ),
    },
    familyNames: list(
      'Abdullayev Rakhimov Yusupov Tursunov Ergashev Nazarov Sultanov Mirzayev Umarov Khodjayev Ismoilov Saidov',
    ),
    familyNamesFemale: list(
      'Abdullayeva Rakhimova Yusupova Tursunova Ergasheva Nazarova Sultanova Mirzayeva Umarova Khodjayeva Ismoilova Saidova',
    ),
  },
  {
    id: 'tajik',
    language: 'tg',
    religion: 'sunni',
    festivals: ['nowruz', ...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Nigora Firuza Mehrona Zarina Shahlo Gulchehra Munira Parvina Tahmina Madina Mavjuda Dilorom Nargis Sitora',
      ),
      male: list(
        'Firdavs Farhod Rustam Jamshed Behruz Daler Sharif Umed Bakhtiyor Faridun Suhrob Davlat Anvar Jahongir',
      ),
    },
    familyNames: list(
      'Rahimov Nazarov Saidov Sharipov Qodirov Safarov Rajabov Mirzoev Hakimov Kholov Sattorov Nurov',
    ),
    familyNamesFemale: list(
      'Rahimova Nazarova Saidova Sharipova Qodirova Safarova Rajabova Mirzoeva Hakimova Kholova Sattorova Nurova',
    ),
  },
  {
    id: 'belarusian',
    language: 'be',
    religion: 'orthodox',
    festivals: ['orthodox-christmas', 'orthodox-easter'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Alena Tatsiana Volha Iryna Natallia Sviatlana Hanna Maryia Katsiaryna Yuliya Darya Anastasiya Valiantsina Liudmila',
      ),
      male: list(
        'Aliaksandr Siarhei Dzmitry Andrei Aliaksei Uladzimir Mikalai Ivan Mikhail Yauhen Maksim Artsiom Pavel Viktar',
      ),
    },
    familyNames: list(
      'Ivanou Kavalenka Kazlou Marozau Yakubovich Karpovich Lukashevich Shauchenka Kuzmich Vasilevich Baranau Zhuk Paulau Savitski',
    ),
    familyNamesFemale: list(
      'Ivanova Kavalenka Kazlova Marozava Yakubovich Karpovich Lukashevich Shauchenka Kuzmich Vasilevich Baranava Zhuk Paulava Savitskaya',
    ),
  },
  {
    id: 'polish',
    language: 'pl',
    religion: 'catholic',
    festivals: ['easter', 'christmas'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Anna Maria Katarzyna Małgorzata Agnieszka Barbara Ewa Krystyna Elżbieta Magdalena Joanna Zofia Julia Aleksandra Natalia',
      ),
      male: list(
        'Piotr Krzysztof Andrzej Tomasz Paweł Jan Michał Marcin Stanisław Jakub Adam Marek Kacper Mateusz',
      ),
    },
    familyNames: list(
      'Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowski Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur',
    ),
    familyNamesFemale: list(
      'Nowak Kowalska Wiśniewska Wójcik Kowalczyk Kamińska Lewandowska Zielińska Szymańska Woźniak Dąbrowska Kozłowska Jankowska Mazur',
    ),
  },
  {
    id: 'german',
    language: 'de',
    religion: 'protestant-secular',
    festivals: ['easter', 'christmas'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Ursula Monika Sabine Petra Andrea Claudia Stefanie Julia Anna Katharina Laura Lena Leonie Birgit Hannah',
      ),
      male: list(
        'Hans Klaus Peter Wolfgang Thomas Michael Andreas Stefan Christian Daniel Jan Lukas Jonas Tobias Leon',
      ),
    },
    familyNames: list(
      'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Klein Wolf',
    ),
  },
  {
    id: 'turkish',
    language: 'tr',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Ayşe Fatma Emine Hatice Zeynep Elif Meryem Şerife Sultan Hülya Esra Merve Büşra Zehra Özlem',
      ),
      male: list(
        'Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim İsmail Osman Murat Emre Yusuf Burak Ömer Kemal',
      ),
    },
    familyNames: list(
      'Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin',
    ),
  },
  {
    id: 'kurdish',
    language: 'ku',
    religion: 'sunni',
    festivals: ['nowruz', ...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Berfin Rojda Zozan Nesrin Hevin Rojin Delal Gulistan Jiyan Perwin Nazdar Shirin Sozdar',
      ),
      male: list(
        'Azad Welat Baran Serhat Rizgar Kawa Hejar Serdar Rojhat Dilshad Aram Delil Berzan',
      ),
    },
    // Kurds in Türkiye carry Turkish-registered surnames; Kurds in Iran, Persian-style ones.
    familyNames: list(
      'Kaya Demir Aydın Tekin Yıldız Ahmadi Karimi Rahimi Mohammadi Rashidi Qaderi Moradi Azizi',
    ),
  },
  {
    id: 'arab',
    language: 'ar',
    religion: 'shia',
    festivals: [...EIDS, 'ashura'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Fatima Maryam Zainab Nour Huda Rania Lina Samira Amal Hanan Layla Salma Rasha Dalia',
      ),
      male: list(
        'Mohammed Ahmad Ali Hassan Hussein Khaled Youssef Ibrahim Abdullah Mahmoud Samir Tariq Jamal Adnan',
      ),
    },
    familyNames: list(
      'Al-Ahmad Haddad Khalil Saleh Nasser Mansour Al-Khatib Hamdan Al-Salem Abbas Jaber Al-Kaabi Hassan',
    ),
  },
  {
    id: 'azerbaijani',
    language: 'az',
    religion: 'shia',
    festivals: ['nowruz', ...EIDS, 'ashura'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Aysel Gunay Leyla Nigar Sevinj Aynur Konul Gulnar Lala Nargiz Sabina Aygun Fidan Ulviyya',
      ),
      male: list(
        'Elchin Rashad Elvin Anar Tural Farid Orkhan Ramil Vugar Kamran Rovshan Ilgar Nijat Emin Elnur',
      ),
    },
    familyNames: list(
      'Mammadov Hasanov Huseynov Guliyev Hajiyev Rasulov Suleymanov Musayev Abbasov Babayev Ismayilov Jafarov Najafov',
    ),
    familyNamesFemale: list(
      'Mammadova Hasanova Huseynova Guliyeva Hajiyeva Rasulova Suleymanova Musayeva Abbasova Babayeva Ismayilova Jafarova Najafova',
    ),
  },
  {
    id: 'persian',
    language: 'fa',
    religion: 'shia',
    festivals: ['nowruz', ...EIDS, 'ashura'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Maryam Fatemeh Zahra Sara Nazanin Leila Shirin Parisa Azadeh Fereshteh Nasrin Mina Niloufar Elham Somayeh',
      ),
      male: list(
        'Mohammad Ali Hossein Reza Mehdi Amir Hamid Saeed Majid Morteza Babak Farhad Arash Ebrahim Behnam',
      ),
    },
    familyNames: list(
      'Mohammadi Hosseini Ahmadi Rezaei Moradi Karimi Jafari Rahimi Ghasemi Sadeghi Heidari Kazemi Rostami Najafi',
    ),
  },
  {
    id: 'baloch',
    language: 'bal',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Mahgul Hani Shabnam Nazia Sabira Zarina Gulnaz Rukhsana Samina Banuk Zubaida Hameeda Nasreen Mahnaz',
      ),
      male: list(
        'Nasir Jalal Dilawar Dostain Bashir Rahim Naveed Asif Sabir Gulzar Shahdad Wahid Karim Ghaus',
      ),
    },
    familyNames: list(
      'Marri Bugti Rind Jamali Zehri Magsi Lashari Kalmati Bizenjo Rakhshani Hoth Gichki Baloch Shahbakhsh',
    ),
  },
  {
    id: 'pashtun',
    language: 'ps',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Gulalai Zarghuna Palwasha Meena Shazia Farzana Naheed Saima Rukhsar Zarmina Laila Shabana Gulnaz Sidra',
      ),
      male: list(
        'Zarak Farhad Hamid Sher Noor Zahir Aimal Samiullah Rahmatullah Bilal Ihsan Fazal Janan Gul Sajid',
      ),
    },
    familyNames: list(
      'Khan Khattak Mohmand Durrani Wazir Shinwari Achakzai Kakar Marwat Bangash Orakzai Afridi Tareen',
    ),
  },
  {
    id: 'punjabi',
    language: 'pa',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Ayesha Fatima Sana Hina Amna Nadia Sadia Rabia Samina Shazia Kiran Mehwish Iqra Tahira Parveen',
      ),
      male: list(
        'Muhammad Ahmed Ali Usman Bilal Asad Kamran Tariq Zubair Waqas Naveed Hamza Irfan Arshad Javed',
      ),
    },
    familyNames: list(
      'Butt Chaudhry Malik Awan Rana Gill Cheema Bajwa Sheikh Qureshi Arain Warraich Sandhu Mughal Jutt',
    ),
  },
  {
    id: 'sindhi',
    language: 'sd',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Marvi Sassui Noori Shabana Rukhsana Parveen Zubaida Nasreen Shazia Saima Hameeda Rehana Sughra Ambreen Farzana',
      ),
      male: list(
        'Akbar Ali Imdad Manzoor Qadir Sikandar Ayaz Sajjad Mumtaz Naveed Ghous Nisar Rasool Zafar Aijaz',
      ),
    },
    familyNames: list(
      'Soomro Memon Shaikh Abbasi Jatoi Chandio Mahar Laghari Unar Siyal Solangi Kalhoro Junejo Panhwar Khoso',
    ),
  },
  {
    id: 'urdu',
    language: 'ur',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Farah Sadaf Rabia Uzma Nida Hira Saba Huma Zainab Maryam Bushra Samina Tahira Anum Sidra',
      ),
      male: list(
        'Faisal Fahad Nabeel Kashif Asif Arif Shoaib Rizwan Junaid Owais Sohail Hassan Talha Zeeshan Danish',
      ),
    },
    familyNames: list(
      'Siddiqui Qureshi Ansari Farooqui Hashmi Zaidi Rizvi Naqvi Jafri Usmani Abidi Kazmi Mirza',
    ),
  },
  {
    id: 'gilgiti',
    language: 'scl',
    religion: 'shia',
    festivals: ['nowruz', ...EIDS, 'ashura'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Zainab Sakina Kulsoom Masooma Shireen Gulshan Rehana Shahida Bilqees Nusrat Gulnar Rozina',
      ),
      male: list(
        'Abbas Hussain Jaffar Raza Sajjad Sultan Nazir Amjad Shahzad Iqbal Sher Didar Babar Wajid',
      ),
    },
    familyNames: list('Baig Hunzai Shah Ali Nagri Khan Shigri Balti Mirza Jafri Rizvi Kazmi'),
  },
  {
    id: 'egyptian',
    language: 'ar-EG',
    religion: 'sunni',
    festivals: [...EIDS],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Fatma Mona Amira Heba Nadia Shaimaa Aya Nour Doaa Rehab Hanan Mervat Salma Esraa Yasmin',
      ),
      male: list(
        'Mohamed Ahmed Mahmoud Mostafa Ali Omar Youssef Khaled Tarek Hany Amr Ibrahim Hesham Sayed Walid',
      ),
    },
    familyNames: list(
      'El-Sayed Hassan Ibrahim Mahmoud Mostafa Abdallah Hussein Fathy Gamal Soliman Farouk Kamal Adel Abdelhamid',
    ),
  },
  {
    id: 'copt',
    language: 'ar-EG',
    religion: 'coptic',
    festivals: ['coptic-christmas', 'orthodox-easter'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Mariam Marina Demiana Christine Irini Nermeen Nevine Mira Verina Martha Sally Hanaa',
      ),
      male: list(
        'Mina Girgis Beshoy Kirollos Morcos Fady Ramy Magdy Samir Nabil Emad Abanoub Maher',
      ),
    },
    familyNames: list(
      'Hanna Youssef Boules Guirguis Shenouda Tadros Mikhail Wissa Iskander Farag Aziz Habib Saad Labib',
    ),
  },
  {
    id: 'greek',
    language: 'el',
    religion: 'orthodox',
    // The Church of Greece keeps Christmas on 25 December; only Easter follows the Julian date.
    festivals: ['christmas', 'orthodox-easter'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Maria Eleni Aikaterini Vasiliki Georgia Sofia Dimitra Konstantina Eirini Panagiota Ioanna Christina Despoina Angeliki',
      ),
      male: list(
        'Georgios Ioannis Konstantinos Dimitrios Nikolaos Panagiotis Vasileios Christos Athanasios Michail Evangelos Spyridon Alexandros Petros',
      ),
    },
    familyNames: list(
      'Papadopoulos Papadakis Georgiou Oikonomou Nikolaou Papageorgiou Vlachos Pappas Dimitriou Konstantinidis Makris Angelopoulos Karagiannis Ioannou',
    ),
    familyNamesFemale: list(
      'Papadopoulou Papadaki Georgiou Oikonomou Nikolaou Papageorgiou Vlachou Pappa Dimitriou Konstantinidou Makri Angelopoulou Karagianni Ioannou',
    ),
  },
  {
    id: 'albanian',
    language: 'sq',
    religion: 'sunni',
    // Albania keeps an interfaith calendar: both Bajrams, both Easters, Christmas and Nevruz.
    festivals: ['nowruz', 'eid-al-fitr', 'eid-al-adha', 'easter', 'orthodox-easter', 'christmas'],
    nameOrder: 'given-first',
    givenNames: {
      female: list(
        'Drita Mimoza Albana Blerina Elona Arjola Mirela Anila Klodiana Ermira Jonida Ardita Eriona Megi',
      ),
      male: list(
        'Arben Artan Gëzim Ilir Fatmir Besnik Agron Dritan Sokol Erion Klajdi Ervin Altin Endrit Flamur',
      ),
    },
    familyNames: list(
      'Hoxha Shehu Dervishi Leka Gjoka Kola Hysa Cela Muça Prifti Marku Duka Basha Lika',
    ),
  },
];
