import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
export async function loadSqlAsset(moduleId: number): Promise<string> {
    const asset = Asset.fromModule(moduleId)

    await asset.downloadAsync()

    if (!asset.localUri) {
        throw new Error(`Could not load SQL asset: ${asset.name}`)
    }

    const file = new File(asset.localUri)

    return await file.text()
}