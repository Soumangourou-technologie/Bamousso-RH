export const course = {
  id: "prospection-commerciale-v1",
  title: "Prospection commerciale",
  description: "Préparer sa cible, obtenir un premier rendez-vous et organiser ses relances.",
  durationMinutes: 30,
  lessons: [
    {
      id: "cibler",
      title: "Choisir ses prospects",
      paragraphs: [
        "Définissez les entreprises auxquelles votre offre peut rendre service. Notez le secteur, la taille, la localisation et le problème que vous savez résoudre. Dans chaque entreprise, identifiez la personne qui peut décider ou vous orienter.",
        "Exercice : choisissez cinq entreprises et écrivez pour chacune un besoin concret que vous pourriez vérifier lors du premier échange.",
      ],
    },
    {
      id: "contacter",
      title: "Réussir le premier contact",
      paragraphs: [
        "Présentez-vous brièvement, reliez votre offre à un besoin possible et posez une question ouverte. Proposez un rendez-vous court avec un créneau précis lorsque l’interlocuteur confirme son intérêt.",
        "Exercice : rédigez un message de trois phrases pour l’une des entreprises ciblées. Terminez par une question ou une proposition de rendez-vous.",
      ],
    },
    {
      id: "relancer",
      title: "Relancer et mesurer ses résultats",
      paragraphs: [
        "Après chaque échange, notez le résultat, la prochaine action et sa date. Lors de la relance, rappelez le contexte et ajoutez un élément utile, par exemple une réponse à une question soulevée pendant l’appel.",
        "Exercice : créez un tableau avec les colonnes Prospect, Dernier échange, Prochaine action et Date. En fin de semaine, comptez les contacts utiles et les rendez-vous obtenus.",
      ],
    },
  ],
};

export const quiz = [
  {
    prompt: "Que vérifier en priorité avant de contacter une entreprise ?",
    options: ["Sa popularité sur les réseaux", "L’existence d’un besoin auquel votre offre répond", "Le nombre de messages envoyés à d’autres entreprises"],
    answer: 1,
  },
  {
    prompt: "Quel objectif fixer au premier échange avec un prospect intéressé ?",
    options: ["Obtenir un rendez-vous avec un créneau précis", "Présenter toutes les offres de l’entreprise", "Exiger une décision immédiate"],
    answer: 0,
  },
  {
    prompt: "Quelle information rend une relance plus facile à organiser ?",
    options: ["Le nom du commercial uniquement", "Le montant total des ventes du mois", "La prochaine action et sa date"],
    answer: 2,
  },
];
