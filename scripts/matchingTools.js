function wordDif(pWord) {
    let cons = ["b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"]
}

const levenshteinDistance = (str1 = '', str2 = '') => {
    let vow = ["a", "e", "i", "o", "u", "y"];
    let cons = ["b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"]

    const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            //doing every comparison of every position
            //the base is zero for if those two match
            //Note:they may match in different positions
            const indicator = ((str1[i - 1] === str2[j - 1]) ? 0 :
                (((vow.indexOf(str1[i - 1]) > -1) && (vow.indexOf(str2[j - 1]) > -1)) ? (6 * 5) / (20 * 19) :
                    (((cons.indexOf(str1[i - 1]) > -1) && (cons.indexOf(str2[j - 1]) > -1) ? 1 : (6 + 6) / 19))));
            //this looks at three possible scores to see what is the minimum
            //accumulated penalties to be carried forward.
            //As we take each letter of the first word and
            //compare it across the letters of the second word
            //we have two scenarios
            //1) These two letters match
            //2) These two letters don't match
            //If they match then the last penalty number has a one point advantage
            //This is labelled substitution because the diagonal will be the minimum
            //when everybody matches except one swap. All the off diagonal matches will
            //have higher scores. But really this should be labelled sequence because
            //matching sequences do not contribut for the match, but this only works swaps of individual
            //letters, not blocks
            //when you have an insertion or deletion, the diagonal pattern is shifted over by one
            //and the these two find that and bring that low score back to the main diagonal.
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution (no swap)
            );
        }
    }
    return track[str2.length][str1.length];
};

function test() {
    let ans = levenshteinDistance('kntten', 'kitten');
}