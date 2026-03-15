<script>
    import TextDisplay from "../common/TextDisplay.svelte";
    import Checkbox from "../common/Checkbox.svelte";
    import { onMount } from "svelte";
    import fs from "fs";
    import path from "path";
    import { canGoBack, canGoForward, nextPage, hasLoaded } from "../stores/navigation";
    import { hasAgreed } from "../stores/installation";

    let licenseText = "";

    // Load license when component mounts
    onMount(() => {
        hasLoaded.set(true);
        readLicenseFile();
    });

    // Reactive: enable "next" button only if user agreed
    $: canGoForward.set($hasAgreed);
    canGoBack.set(false);

    // Set next page in installer
    nextPage.set("/actions");

    // Read license file from __static folder
    function readLicenseFile() {
        const licensePath = path.join(__static, "license.txt");
        fs.readFile(licensePath, "utf8", (err, data) => {
            if (err) {
                licenseText = "See license at https://github.com/TheFallenNightAdmin/HaxCord/blob/main/LICENSE";
            } else {
                licenseText = data;
            }
        });
    }

    // Handle checkbox toggle
    function toggleAgree(event) {
        hasAgreed.set(event.target.checked);
        canGoForward.set(event.target.checked);
    }
</script>

<section class="page" in:page={{ duration: $hasLoaded ? undefined : 0 }} out:page={{ out: true }}>
    <!-- License text display -->
    <TextDisplay value={licenseText} />

    <!-- Accept license checkbox -->
    <Checkbox
        checked={$hasAgreed}
        disabled={!licenseText}
        label="I accept the license agreement."
        on:change={toggleAgree}
    />
</section>
