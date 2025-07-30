/*
This file contains the Language model.
*/

/*
{
    languageCodes: [ 'cmn-CN' ],
    name: 'cmn-CN-Chirp3-HD-Laomedeia',
    ssmlGender: 'FEMALE',
    naturalSampleRateHertz: 24000
  }
*/
export interface Language {
    languageCodes: string[];
    name: string;
    ssmlGender: string;
    naturalSampleRateHertz: number;
}

/*
{
    voices: [
        {
            languageCodes: [ 'cmn-CN' ],
            name: 'cmn-CN-Chirp3-HD-Laomedeia',
            ssmlGender: 'FEMALE',
            naturalSampleRateHertz: 24000
        }
    ]
}
*/
export interface Voice {
    languageCodes: string[];
    name: string;
    ssmlGender: string;
    naturalSampleRateHertz: number;
}

export interface Voices {
    voices: Voice[];
}