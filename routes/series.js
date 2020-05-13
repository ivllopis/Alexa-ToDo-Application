const express = require('express');
const router = express.Router();

const series = [
    {
      slide_num: 0,
      source: "pictures/Astral_Waste.png",
      description: "This is a description for the Astral Waste item in Dark Souls III."
    },
    {
      slide_num: 1,
      source: "pictures/Astrologist_Icon.png",
      description: "This is a description for the Astrologist item in Dark Souls III."
    },
    {
      slide_num: 2,
      source: "pictures/Star_Jelly.png",
      description: "This is a description for the Star Jelly item in Dark Souls III."
    },
    {
      slide_num: 3,
      source: "pictures/Star_Nectar.png",
      description: "This is a description for the Star Nectar item in Dark Souls III."
    },
    {
      slide_num: 4,
      source: "pictures/Astral_Waste.png",
      description: "This is a description for the Astral Waste item in Dark Souls III."
    },
    {
      slide_num: 5,
      source: "pictures/Astrologist_Icon.png",
      description: "This is a description for the Astrologist item in Dark Souls III."
    },
    {
      slide_num: 6,
      source: "pictures/Star_Jelly.png",
      description: "This is a description for the Star Jelly item in Dark Souls III."
    },
    {
      slide_num: 7,
      source: "pictures/Star_Nectar.png",
      description: "This is a description for the Star Nectar item in Dark Souls III."
    }
]

router.get('/', (req, res) => {
    res.send("You are interested in series.")
});

router.get('/any', (req, res) => {
    const recommended_random_serie = Math.round(Math.random() * series.length);
    res.json(series[recommended_random_serie]);
});

router.get('/:id', (req, res) => {
    try{
        const indexSerie = parseInt(req.params.id);
        if(isNaN(indexSerie)){
            res.send("This serie is not valid."); //normally we would flash around this error!
        } else if(indexSerie > series.length) res.send("This series does not exist.");
        else res.json(series[parseInt(req.params.id)]);
    }catch(e){
        console.log(e);
    }
});

module.exports = router;