// functions/utils/nsfw.ts

// https://sightengine.com/docs/advanced-nudity-detection-model-2.1

// curl -X POST 'https://api.sightengine.com/1.0/check.json' \
//     -F 'media=@/path/to/image.jpg' \
//     -F 'models=nudity-2.1' \
//     -F 'api_user={api_user}' \
//     -F 'api_secret={api_secret}'

// {
//   "status": "success",
//   "request": {
//     "id": "req_1SJJxJjUHnSVWreApx9fF",
//     "timestamp": 1693574119.571633,
//     "operations": 1
//   },
//   "nudity": {
//     "sexual_activity": 0.01,
//     "sexual_display": 0.01,
//     "erotica": 0.01,
//     "very_suggestive": 0.01,
//     "suggestive": 0.01,
//     "mildly_suggestive": 0.01,
//     "suggestive_classes": {
//       "bikini": 0.01,
//       "cleavage": 0.01,
//       "cleavage_categories": {
//         "very_revealing": 0.01,
//         "revealing": 0.01,
//         "none": 0.99
//       },
//       "lingerie": 0.01,
//       "male_chest": 0.01,
//       "male_chest_categories": {
//         "very_revealing": 0.01,
//         "revealing": 0.01,
//         "slightly_revealing": 0.01,
//         "none": 0.99
//       },
//       "male_underwear": 0.01,
//       "miniskirt": 0.01,
//       "other": 0.01,
//       "minishort": 0.11,
//       "nudity_art": 0.01,
//       "schematic": 0.01,
//       "sextoy": 0.01,
//       "suggestive_focus": 0.01,
//       "suggestive_pose": 0.01,
//       "swimwear_male": 0.01,
//       "swimwear_one_piece": 0.01,
//       "visibly_undressed": 0.01
//     },
//     "none": 0.99,
//     "context": {
//       "sea_lake_pool": 0.01,
//       "outdoor_other": 0.99,
//       "indoor_other": 0.01
//     }
//   },
//   "media": {
//     "id": "med_1SJJEFuLqeSedThQjhNoS",
//     "uri": "https://sightengine.com/assets/img/examples/example-fac-1000.jpg"
//   }
// }

export async function checkUnsafeImgBySightengine(
  file: File,
  api_user: string,
  api_secret: string
): Promise<boolean> {
  const formData = new FormData();
  formData.append("media", file);
  formData.append("models", "nudity-2.1");
  formData.append("api_user", api_user);
  formData.append("api_secret", api_secret);

  const response = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (data.status !== "success") {
    console.log(data);
    throw new Error(data);
  }
  const { sexual_activity, sexual_display, erotica, suggestive } = data.nudity;
  if (
    sexual_activity > 0.5 ||
    sexual_display > 0.5 ||
    erotica > 0.5 ||
    suggestive > 0.5
  ) {
    return true;
  }
  return false;
}
